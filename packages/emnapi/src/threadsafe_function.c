#include "node_api.h"
#include "emnapi_internal.h"

#if NAPI_VERSION >= 4 && EMNAPI_HAVE_THREADS
#include <stdatomic.h>
#include <pthread.h>
#include <errno.h>
#include "uv/queue.h"

#include "uv.h"

EXTERN_C_START

EMNAPI_INTERNAL_EXTERN void _emnapi_call_finalizer(int force_uncaught, napi_env env, napi_finalize cb, void* data, void* hint);

static const unsigned char kDispatchIdle = 0;
static const unsigned char kDispatchRunning = 1 << 0;
static const unsigned char kDispatchPending = 1 << 1;

static const unsigned int kMaxIterationCount = 1000;

struct data_queue_node {
  void* data;
  void* q[2];
};

struct napi_threadsafe_function__ {
  ASYNC_RESOURCE_FIELD
  // These are variables protected by the mutex.
  pthread_mutex_t mutex;
  pthread_cond_t* cond;
  size_t queue_size;
  void* queue[2];
  uv_async_t async;
  size_t thread_count;
  bool is_closing;
  atomic_uchar dispatch_state;

  // These are variables set once, upon creation, and then never again, which
  // means we don't need the mutex to read them.
  void* context;
  size_t max_queue_size;

  // These are variables accessed only from the loop thread.
  napi_ref ref;
  napi_env env;
  void* finalize_data;
  napi_finalize finalize_cb;
  napi_threadsafe_function_call_js call_js_cb;
  bool handles_closing;
  bool async_ref;
};

static void _emnapi_tsfn_default_call_js(napi_env env, napi_value cb, void* context, void* data) {
  if (!(env == NULL || cb == NULL)) {
    napi_value recv;
    napi_status status;

    status = napi_get_undefined(env, &recv);
    if (status != napi_ok) {
      napi_throw_error(env, "ERR_NAPI_TSFN_GET_UNDEFINED",
          "Failed to retrieve undefined value");
      return;
    }

    status = napi_call_function(env, recv, cb, 0, NULL, NULL);
    if (status != napi_ok && status != napi_pending_exception) {
      napi_throw_error(env, "ERR_NAPI_TSFN_CALL_JS",
          "Failed to call JS callback");
      return;
    }
  }
}

static void _emnapi_tsfn_cleanup(void* data);

static napi_threadsafe_function
_emnapi_tsfn_create(napi_env env,
                    napi_ref ref,
                    napi_value async_resource,
                    napi_value async_resource_name,
                    size_t max_queue_size,
                    size_t initial_thread_count,
                    void* thread_finalize_data,
                    napi_finalize thread_finalize_cb,
                    void* context,
                    napi_threadsafe_function_call_js call_js_cb) {
  napi_threadsafe_function ts_fn =
    (napi_threadsafe_function) calloc(1, sizeof(struct napi_threadsafe_function__));
  if (ts_fn == NULL) return NULL;
  EMNAPI_ASYNC_RESOURCE_CTOR(env, async_resource, async_resource_name, (emnapi_async_resource*) ts_fn);
  pthread_mutex_init(&ts_fn->mutex, NULL);
  ts_fn->cond = NULL;
  ts_fn->queue_size = 0;
  QUEUE_INIT(&ts_fn->queue);
  ts_fn->thread_count = initial_thread_count;
  ts_fn->is_closing = false;
  ts_fn->dispatch_state = kDispatchIdle;

  ts_fn->context = context;
  ts_fn->max_queue_size = max_queue_size;

  ts_fn->ref = ref;
  ts_fn->env = env;
  ts_fn->finalize_data = thread_finalize_data;
  ts_fn->finalize_cb = thread_finalize_cb;
  ts_fn->call_js_cb = call_js_cb;
  ts_fn->handles_closing = false;

  EMNAPI_ASSERT_CALL(napi_add_env_cleanup_hook(env, _emnapi_tsfn_cleanup, ts_fn));
  _emnapi_env_ref(env);

  EMNAPI_KEEPALIVE_PUSH();
  _emnapi_ctx_increase_waiting_request_counter();
  ts_fn->async_ref = true;
  return ts_fn;
}

static void _emnapi_tsfn_destroy(napi_threadsafe_function func) {
  if (func == NULL) return;
  pthread_mutex_destroy(&func->mutex);
  if (func->cond) {
    pthread_cond_destroy(func->cond);
    free(func->cond);
    func->cond = NULL;
  }

  QUEUE* tmp;
  struct data_queue_node* node;
  QUEUE_FOREACH(tmp, &func->queue) {
    node = QUEUE_DATA(tmp, struct data_queue_node, q);
    free(node);
  }
  QUEUE_INIT(&func->queue);

  if (func->ref != NULL) {
    EMNAPI_ASSERT_CALL(napi_delete_reference(func->env, func->ref));
  }

  EMNAPI_ASSERT_CALL(napi_remove_env_cleanup_hook(func->env, _emnapi_tsfn_cleanup, func));
  _emnapi_env_unref(func->env);
  if (func->async_ref) {
    EMNAPI_KEEPALIVE_POP();
    _emnapi_ctx_decrease_waiting_request_counter();
    func->async_ref = false;
  }

  EMNAPI_ASYNC_RESOURCE_DTOR(func->env, (emnapi_async_resource*) func);
  free(func);
}

static void _emnapi_tsfn_do_destroy(uv_handle_t* data) {
  napi_threadsafe_function func = container_of(data, struct napi_threadsafe_function__, async);
  _emnapi_tsfn_destroy(func);
}

static void _emnapi_tsfn_dispatch(napi_threadsafe_function func);

// only main thread
static void _emnapi_tsfn_async_cb(uv_async_t* data) {
  napi_threadsafe_function tsfn = container_of(data, struct napi_threadsafe_function__, async);
  _emnapi_tsfn_dispatch(tsfn);
}

// only main thread
static napi_status _emnapi_tsfn_init(napi_threadsafe_function func) {
  uv_loop_t* loop = uv_default_loop();
  if (uv_async_init(loop, &func->async, _emnapi_tsfn_async_cb) == 0) {
    int r;
    if (func->max_queue_size > 0) {
      func->cond = (pthread_cond_t*) malloc(sizeof(pthread_cond_t));
      if (func->cond != NULL) {
        r = pthread_cond_init(func->cond, NULL);
        if (r != 0) {
          free(func->cond);
          func->cond = NULL;
        }
      }
    }
    if (func->max_queue_size == 0 || func->cond) {
      return napi_ok;
    }
    uv_close((uv_handle_t*) &func->async, _emnapi_tsfn_do_destroy);
  }
  _emnapi_tsfn_destroy(func);
  return napi_generic_failure;
}

static void _emnapi_tsfn_empty_queue_and_delete(napi_threadsafe_function func) {
  while (!QUEUE_EMPTY(&func->queue)) {
    QUEUE* q = QUEUE_HEAD(&func->queue);
    struct data_queue_node* node = QUEUE_DATA(q, struct data_queue_node, q);

    func->call_js_cb(NULL, NULL, func->context, node->data);

    QUEUE_REMOVE(q);
    QUEUE_INIT(q);
    func->queue_size--;
    free(node);
  }
  _emnapi_tsfn_destroy(func);
}

static napi_value _emnapi_tsfn_finalize_in_callback_scope(napi_env env, napi_callback_info info) {
  void* data = NULL;
  EMNAPI_ASSERT_CALL(napi_get_cb_info(env, info, NULL, NULL, NULL, &data));
  napi_threadsafe_function func = (napi_threadsafe_function) data;
  _emnapi_call_finalizer(0, func->env, func->finalize_cb, func->finalize_data, func->context);
  return NULL;
}

static void _emnapi_tsfn_finalize(napi_threadsafe_function func) {
  napi_handle_scope scope;
  EMNAPI_ASSERT_CALL(napi_open_handle_scope(func->env, &scope));
  if (func->finalize_cb) {
    if (emnapi_is_node_binding_available()) {
      napi_value resource, cb;
      EMNAPI_ASSERT_CALL(napi_get_reference_value(func->env, func->resource_, &resource));
      EMNAPI_ASSERT_CALL(napi_create_function(func->env, NULL, 0, _emnapi_tsfn_finalize_in_callback_scope, func, &cb));
      _emnapi_node_make_callback(func->env,
                                resource,
                                cb,
                                NULL,
                                0,
                                func->async_context_.async_id,
                                func->async_context_.trigger_async_id,
                                NULL);
    } else {
      _emnapi_call_finalizer(0, func->env, func->finalize_cb, func->finalize_data, func->context);
    }
  }
  _emnapi_tsfn_empty_queue_and_delete(func);
  EMNAPI_ASSERT_CALL(napi_close_handle_scope(func->env, scope));
}

static void _emnapi_tsfn_do_finalize(uv_handle_t* data) {
  napi_threadsafe_function func = container_of(data, struct napi_threadsafe_function__, async);
  _emnapi_tsfn_finalize(func);
}

static void _emnapi_tsfn_close_handles_and_maybe_delete(
  napi_threadsafe_function func, bool set_closing) {
  napi_handle_scope scope;
  EMNAPI_ASSERT_CALL(napi_open_handle_scope(func->env, &scope));

  if (set_closing) {
    pthread_mutex_lock(&func->mutex);
    func->is_closing = true;
    if (func->max_queue_size > 0) {
      pthread_cond_signal(func->cond);
    }
    pthread_mutex_unlock(&func->mutex);
  }
  if (func->handles_closing) {
    return;
  }
  func->handles_closing = true;
  uv_close((uv_handle_t*)&func->async, _emnapi_tsfn_do_finalize);

  EMNAPI_ASSERT_CALL(napi_close_handle_scope(func->env, scope));
}

static void _emnapi_tsfn_cleanup(void* data) {
  _emnapi_tsfn_close_handles_and_maybe_delete((napi_threadsafe_function) data, true);
}

static void _emnapi_tsfn_call_js_cb(napi_env env, void* arg) {
  void** args = (void**) arg;
  napi_threadsafe_function func = (napi_threadsafe_function) *args;
  napi_value js_callback = (napi_value) *(args + 1);
  void* data = *(args + 2);
  func->call_js_cb(func->env, js_callback, func->context, data);
}

static napi_value _emnapi_tsfn_call_js_cb_in_callback_scope(napi_env env, napi_callback_info info) {
  void* data = NULL;
  EMNAPI_ASSERT_CALL(napi_get_cb_info(env, info, NULL, NULL, NULL, &data));
  _emnapi_callback_into_module(0, env, _emnapi_tsfn_call_js_cb, data, 1);
  return NULL;
}

// static void _emnapi_tsfn_

// only main thread
static bool _emnapi_tsfn_dispatch_one(napi_threadsafe_function func) {
  void* data = NULL;
  bool popped_value = false;
  bool has_more = false;

  {
    pthread_mutex_lock(&func->mutex);

    if (func->is_closing) {
      _emnapi_tsfn_close_handles_and_maybe_delete(func, false);
    } else {
      size_t size = func->queue_size;
      if (size > 0) {
        QUEUE* q = QUEUE_HEAD(&func->queue);
        struct data_queue_node* node = QUEUE_DATA(q, struct data_queue_node, q);
        QUEUE_REMOVE(q);
        QUEUE_INIT(q);
        func->queue_size--;
        data = node->data;
        free(node);
        popped_value = true;
        if (size == func->max_queue_size && func->max_queue_size > 0) {
          pthread_cond_signal(func->cond);
        }
        size--;
      }

      if (size == 0) {
        if (func->thread_count == 0) {
          func->is_closing = true;
          if (func->max_queue_size > 0) {
            pthread_cond_signal(func->cond);
          }
          _emnapi_tsfn_close_handles_and_maybe_delete(func, false);
        }
      } else {
        has_more = true;
      }
    }
    pthread_mutex_unlock(&func->mutex);
  }

  if (popped_value) {
    napi_handle_scope scope;
    EMNAPI_ASSERT_CALL(napi_open_handle_scope(func->env, &scope));
    napi_value js_callback = NULL;
    void* jscb_data[3] = { (void*)(func), NULL, data };
    if (func->ref != NULL) {
      EMNAPI_ASSERT_CALL(napi_get_reference_value(func->env, func->ref, &js_callback));
      jscb_data[1] = (void*)js_callback;
    }

    if (emnapi_is_node_binding_available()) {
      napi_value resource, cb;
      EMNAPI_ASSERT_CALL(napi_get_reference_value(func->env, func->resource_, &resource));
      EMNAPI_ASSERT_CALL(napi_create_function(func->env, NULL, 0, _emnapi_tsfn_call_js_cb_in_callback_scope, jscb_data, &cb));
      _emnapi_node_make_callback(func->env,
                                resource,
                                cb,
                                NULL,
                                0,
                                func->async_context_.async_id,
                                func->async_context_.trigger_async_id,
                                NULL);
    } else {
      _emnapi_callback_into_module(0, func->env, _emnapi_tsfn_call_js_cb, jscb_data, 1);
    }
    EMNAPI_ASSERT_CALL(napi_close_handle_scope(func->env, scope));
  }

  return has_more;
}

// all threads
static void _emnapi_tsfn_send(napi_threadsafe_function func) {
  unsigned char current_state =
    atomic_fetch_or(&func->dispatch_state, kDispatchPending);
  if ((current_state & kDispatchRunning) == kDispatchRunning) {
    return;
  }
  CHECK_EQ(0, uv_async_send(&func->async));
}

// only main thread
static void _emnapi_tsfn_dispatch(napi_threadsafe_function func) {
  bool has_more = true;

  // Limit maximum synchronous iteration count to prevent event loop
  // starvation. See `src/node_messaging.cc` for an inspiration.
  unsigned int iterations_left = kMaxIterationCount;
  while (has_more && --iterations_left != 0) {
    atomic_store(&func->dispatch_state, kDispatchRunning);
    has_more = _emnapi_tsfn_dispatch_one(func);

    // Send() was called while we were executing the JS function
    if (atomic_exchange(&func->dispatch_state, kDispatchIdle) != kDispatchRunning) {
      has_more = true;
    }
  }

  if (has_more) {
    _emnapi_tsfn_send(func);
  }
}

EXTERN_C_END

#endif

#if NAPI_VERSION >= 4

EXTERN_C_START

napi_status
napi_create_threadsafe_function(napi_env env,
                                napi_value func,
                                napi_value async_resource,
                                napi_value async_resource_name,
                                size_t max_queue_size,
                                size_t initial_thread_count,
                                void* thread_finalize_data,
                                napi_finalize thread_finalize_cb,
                                void* context,
                                napi_threadsafe_function_call_js call_js_cb,
                                napi_threadsafe_function* result) {
#if EMNAPI_HAVE_THREADS
  CHECK_ENV_NOT_IN_GC(env);
  CHECK_ARG(env, async_resource_name);
  RETURN_STATUS_IF_FALSE(env, initial_thread_count > 0, napi_invalid_arg);
  CHECK_ARG(env, result);

  napi_status status = napi_ok;
  napi_ref ref = NULL;

  if (func == NULL) {
    CHECK_ARG(env, call_js_cb);
  } else {
    napi_valuetype type;
    status = napi_typeof(env, func, &type);
    if (status != napi_ok) return napi_set_last_error(env, status, 0, NULL);
    if (type != napi_function) {
      return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
    }
    status = napi_create_reference(env, func, 1, &ref);
    if (status != napi_ok) return napi_set_last_error(env, status, 0, NULL);
  }

  napi_value resource;
  napi_value resource_name;
  if (async_resource != NULL) {
    status = napi_coerce_to_object(env, async_resource, &resource);
    if (status != napi_ok) return status;
  } else {
    status = napi_create_object(env, &resource);
    if (status != napi_ok) return status;
  }

  status = napi_coerce_to_string(env, async_resource_name, &resource_name);
  if (status != napi_ok) return status;

  napi_threadsafe_function ts_fn = _emnapi_tsfn_create(
    env,
    ref,
    resource,
    resource_name,
    max_queue_size,
    initial_thread_count,
    thread_finalize_data,
    thread_finalize_cb,
    context,
    call_js_cb != NULL ? call_js_cb : _emnapi_tsfn_default_call_js);

  if (ts_fn == NULL) {
    status = napi_generic_failure;
  } else {
    // Init deletes ts_fn upon failure.
    status = _emnapi_tsfn_init(ts_fn);
    if (status == napi_ok) {
      *result = ts_fn;
    }
  }

  return napi_set_last_error(env, status, 0, NULL);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

napi_status
napi_get_threadsafe_function_context(napi_threadsafe_function func,
                                     void** result) {
#if EMNAPI_HAVE_THREADS
  CHECK_NOT_NULL(func);
  CHECK_NOT_NULL(result);

  *result = func->context;

  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_call_threadsafe_function(napi_threadsafe_function func,
                              void* data,
                              napi_threadsafe_function_call_mode mode) {
#if EMNAPI_HAVE_THREADS
  CHECK_NOT_NULL(func);
  pthread_mutex_lock(&func->mutex);

  while (func->queue_size >= func->max_queue_size &&
      func->max_queue_size > 0 &&
      !func->is_closing) {
    if (mode == napi_tsfn_nonblocking) {
      pthread_mutex_unlock(&func->mutex);
      return napi_queue_full;
    }
    pthread_cond_wait(func->cond, &func->mutex);
  }

  if (func->is_closing) {
    if (func->thread_count == 0) {
      pthread_mutex_unlock(&func->mutex);
      return napi_invalid_arg;
    } else {
      func->thread_count--;
      pthread_mutex_unlock(&func->mutex);
      return napi_closing;
    }
  } else {
    struct data_queue_node* queue_node = (struct data_queue_node*) malloc(sizeof(struct data_queue_node));
    if (queue_node == NULL) {
      pthread_mutex_unlock(&func->mutex);
      return napi_generic_failure;
    }
    queue_node->data = data;
    QUEUE_INSERT_TAIL(&func->queue, &queue_node->q);
    func->queue_size++;
    _emnapi_tsfn_send(func);
    pthread_mutex_unlock(&func->mutex);
    return napi_ok;
  }
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_acquire_threadsafe_function(napi_threadsafe_function func) {
#if EMNAPI_HAVE_THREADS
  CHECK_NOT_NULL(func);
  pthread_mutex_lock(&func->mutex);

  if (func->is_closing) {
    pthread_mutex_unlock(&func->mutex);
    return napi_closing;
  }

  func->thread_count++;

  pthread_mutex_unlock(&func->mutex);
  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_release_threadsafe_function(napi_threadsafe_function func,
                                 napi_threadsafe_function_release_mode mode) {
#if EMNAPI_HAVE_THREADS
  CHECK_NOT_NULL(func);
  pthread_mutex_lock(&func->mutex);

  if (func->thread_count == 0) {
    pthread_mutex_unlock(&func->mutex);
    return napi_invalid_arg;
  }

  func->thread_count--;

  if (func->thread_count == 0 || mode == napi_tsfn_abort) {
    if (!func->is_closing) {
      func->is_closing = (mode == napi_tsfn_abort);
      if (func->is_closing && func->max_queue_size > 0) {
        pthread_cond_signal(func->cond);
      }

      _emnapi_tsfn_send(func);
    }
  }

  pthread_mutex_unlock(&func->mutex);

  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_unref_threadsafe_function(napi_env env, napi_threadsafe_function func) {
#if EMNAPI_HAVE_THREADS
  if (func->async_ref) {
    EMNAPI_KEEPALIVE_POP();
    _emnapi_ctx_decrease_waiting_request_counter();
    func->async_ref = false;
  }
  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_ref_threadsafe_function(napi_env env, napi_threadsafe_function func) {
#if EMNAPI_HAVE_THREADS
  if (!func->async_ref) {
    EMNAPI_KEEPALIVE_PUSH();
    _emnapi_ctx_increase_waiting_request_counter();
    func->async_ref = true;
  }
  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

EXTERN_C_END

#endif
