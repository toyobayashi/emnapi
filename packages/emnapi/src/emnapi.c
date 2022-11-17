#include <stdlib.h>

#ifdef __EMSCRIPTEN_PTHREADS__
#include <pthread.h>
// #include <emscripten/threading.h>
#endif

#include <emscripten.h>
#include <emscripten/heap.h>

#if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30114  // NOLINT
#include <emscripten/eventloop.h>
#endif

#include "emnapi.h"
#include "node_api.h"

#if NAPI_VERSION >= 4 && defined(__EMSCRIPTEN_PTHREADS__)
#include <stdatomic.h>
#include "queue.h"
#endif

#define CHECK_ENV(env)          \
  do {                          \
    if ((env) == NULL) {        \
      return napi_invalid_arg;  \
    }                           \
  } while (0)

#define RETURN_STATUS_IF_FALSE(env, condition, status)                  \
  do {                                                                  \
    if (!(condition)) {                                                 \
      return napi_set_last_error((env), (status), 0, NULL);             \
    }                                                                   \
  } while (0)

#define CHECK_ARG(env, arg) \
  RETURN_STATUS_IF_FALSE((env), ((arg) != NULL), napi_invalid_arg)

#define CHECK(expr)                                                           \
  do {                                                                        \
    if (!(expr)) {                                                            \
      abort();                                                                \
    }                                                                         \
  } while (0)

#define CHECK_NOT_NULL(val) CHECK((val) != NULL)

#define CHECK_EQ(a, b) CHECK((a) == (b))

EXTERN_C_START

extern napi_status napi_set_last_error(napi_env env,
                                       napi_status error_code,
                                       uint32_t engine_error_code,
                                       void* engine_reserved);
extern napi_status napi_clear_last_error(napi_env env);

#if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30114  // NOLINT
#define EMNAPI_KEEPALIVE_PUSH emscripten_runtime_keepalive_push
#define EMNAPI_KEEPALIVE_POP emscripten_runtime_keepalive_pop
#else

extern void _emnapi_runtime_keepalive_push();
extern void _emnapi_runtime_keepalive_pop();

#define EMNAPI_KEEPALIVE_PUSH _emnapi_runtime_keepalive_push
#define EMNAPI_KEEPALIVE_POP _emnapi_runtime_keepalive_pop
#endif

const char* emnapi_error_messages[] = {
  NULL,
  "Invalid argument",
  "An object was expected",
  "A string was expected",
  "A string or symbol was expected",
  "A function was expected",
  "A number was expected",
  "A boolean was expected",
  "An array was expected",
  "Unknown failure",
  "An exception is pending",
  "The async work item was cancelled",
  "napi_escape_handle already called on scope",
  "Invalid handle scope usage",
  "Invalid callback scope usage",
  "Thread-safe function queue is full",
  "Thread-safe function handle is closing",
  "A bigint was expected",
  "A date was expected",
  "An arraybuffer was expected",
  "A detachable arraybuffer was expected",
  "Main thread would deadlock",
};

#define EMNAPI_MOD_NAME_X_HELPER(modname) #modname
#define EMNAPI_MOD_NAME_X(modname) EMNAPI_MOD_NAME_X_HELPER(modname)

EMSCRIPTEN_KEEPALIVE
void _emnapi_runtime_init(const char** key, const char*** error_messages) {
  if (key) {
    *key = EMNAPI_MOD_NAME_X(NODE_GYP_MODULE_NAME);
  }
  if (error_messages) *error_messages = emnapi_error_messages;
}

napi_status napi_adjust_external_memory(napi_env env,
                                        int64_t change_in_bytes,
                                        int64_t* adjusted_value) {
  CHECK_ENV(env);
  CHECK_ARG(env, adjusted_value);

  if (change_in_bytes < 0) {
    return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
  }

  size_t old_size = emscripten_get_heap_size();
  int r = emscripten_resize_heap(old_size + (size_t) change_in_bytes);

  *adjusted_value = (int64_t) emscripten_get_heap_size();

  return napi_clear_last_error(env);
}

napi_status
napi_get_node_version(napi_env env,
                      const napi_node_version** version) {
  CHECK_ENV(env);
  CHECK_ARG(env, version);
  static napi_node_version node_version = {
    16,
    15,
    0,
    "node"
  };
  *version = &node_version;
  return napi_clear_last_error(env);
}

napi_status
emnapi_get_emscripten_version(napi_env env,
                              const emnapi_emscripten_version** version) {
  CHECK_ENV(env);
  CHECK_ARG(env, version);
  static emnapi_emscripten_version emscripten_version = {
    __EMSCRIPTEN_major__,
    __EMSCRIPTEN_minor__,
    __EMSCRIPTEN_tiny__
  };
  *version = &emscripten_version;
  return napi_clear_last_error(env);
}

////////////////////////////////////////////////////////////////////////////////
// Async work implementation
////////////////////////////////////////////////////////////////////////////////

#ifdef __EMSCRIPTEN_PTHREADS__

// #ifdef __wasm64__
// #define __EMNAPI_ASYNC_SEND_CALLBACK_SIG \
//   (EM_FUNC_SIG_RETURN_VALUE_V | \
//   EM_FUNC_SIG_WITH_N_PARAMETERS(1) | \
//   EM_FUNC_SIG_SET_PARAM(0, EM_FUNC_SIG_PARAM_I64))
// #else
// #define __EMNAPI_ASYNC_SEND_CALLBACK_SIG EM_FUNC_SIG_VI
// #endif

#ifndef EMNAPI_ASYNC_SEND_TYPE
#define EMNAPI_ASYNC_SEND_TYPE 0
#endif

#if EMNAPI_ASYNC_SEND_TYPE == 0
extern void _emnapi_set_immediate(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_set_immediate((callback), (data))
#elif EMNAPI_ASYNC_SEND_TYPE == 1
extern void _emnapi_next_tick(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_next_tick((callback), (data))
#else
#error "Invalid EMNAPI_ASYNC_SEND_TYPE"
#endif

extern void _emnapi_async_send_js(int type,
                                  void (*callback)(void*),
                                  void* data);

static void _emnapi_async_send(void (*callback)(void*), void* data) {
  // TODO(?): need help
  // Neither emscripten_dispatch_to_thread_async nor MAIN_THREAD_ASYNC_EM_ASM
  // invoke the async complete callback if there is a printf() in worker thread.
  // This breaks "packages/test/pool" tests.
  // Not sure what happens, maybe has deadlock,
  // and not sure whether this is Emscripten bug or my incorrect usage.
  // BTW emscripten_dispatch_to_thread_async seems
  // not support __wasm64__ V_I64 signature yet

  // pthread_t main_thread = emscripten_main_browser_thread_id();
  // if (pthread_equal(main_thread, pthread_self())) {
  //   NEXT_TICK(callback, data);
  // } else {
  //   emscripten_dispatch_to_thread_async(main_thread,
  //                                       __EMNAPI_ASYNC_SEND_CALLBACK_SIG,
  //                                       callback,
  //                                       NULL,
  //                                       data);
  //   // or
  //   // MAIN_THREAD_ASYNC_EM_ASM({
  //   //   emnapiGetDynamicCalls.call_vp($0, $1);
  //   // }, callback, data);
  // }

  // Currently still use JavaScript to send work
  // it's simple and clear
  _emnapi_async_send_js(EMNAPI_ASYNC_SEND_TYPE, callback, data);
}

#include "threadpool.c"

typedef void (*_emnapi_call_into_module_callback)(napi_env env, void* args);
extern void _emnapi_call_into_module(napi_env env, _emnapi_call_into_module_callback callback, void* args);

struct napi_async_work__ {
  napi_env env;
  void* data;
  napi_async_execute_callback execute;
  napi_async_complete_callback complete;
  uv_work_t work_req_;
};

static napi_async_work async_work_init(
  napi_env env,
  napi_async_execute_callback execute,
  napi_async_complete_callback complete,
  void* data
) {
  napi_async_work work = (napi_async_work)calloc(1, sizeof(struct napi_async_work__));
  if (work == NULL) return NULL;
  work->env = env;
  work->execute = execute;
  work->complete = complete;
  work->data = data;
  return work;
}

static void async_work_delete(napi_async_work work) {
  free(work);
}

static void async_work_do_thread_pool_work(napi_async_work work) {
  work->execute(work->env, work->data);
}

typedef struct complete_wrap_s {
  int status;
  napi_async_work work;
} complete_wrap_t;

static napi_status convert_error_code(int code) {
  switch (code) {
    case 0:
      return napi_ok;
    case EINVAL:
      return napi_invalid_arg;
    case ECANCELED:
      return napi_cancelled;
    default:
      return napi_generic_failure;
  }
}

static void async_work_on_complete(napi_env env, void* args) {
  complete_wrap_t* wrap = (complete_wrap_t*) args;
  napi_env _env = wrap->work->env;
  napi_status status = convert_error_code(wrap->status);
  void* data = wrap->work->data;
  free(wrap);
  wrap->work->complete(_env, status, data);
}

static void async_work_after_thread_pool_work(napi_async_work work, int status) {
  if (work->complete == NULL) return;
  napi_handle_scope scope;
  napi_open_handle_scope(work->env, &scope);
  complete_wrap_t* wrap = (complete_wrap_t*) malloc(sizeof(complete_wrap_t));
  wrap->status = status;
  wrap->work = work;
  _emnapi_call_into_module(work->env, async_work_on_complete, wrap);
  napi_close_handle_scope(work->env, scope);
}

static void async_work_schedule_work_on_execute(uv_work_t* req) {
  napi_async_work self = container_of(req, struct napi_async_work__, work_req_);
  async_work_do_thread_pool_work(self);
}

static void async_work_schedule_work_on_complete(uv_work_t* req, int status) {
  napi_async_work self = container_of(req, struct napi_async_work__, work_req_);
  EMNAPI_KEEPALIVE_POP();
  async_work_after_thread_pool_work(self, status);
}

static void async_work_schedule_work(napi_async_work work) {
  EMNAPI_KEEPALIVE_PUSH();
  int status = uv_queue_work(&loop,
                             &work->work_req_,
                             async_work_schedule_work_on_execute,
                             async_work_schedule_work_on_complete);
  CHECK_EQ(status, 0);
}

static int async_work_cancel_work(napi_async_work work) {
  return uv_cancel((uv_req_t*)&work->work_req_);
}

#endif

napi_status napi_create_async_work(napi_env env,
                                   napi_value async_resource,
                                   napi_value async_resource_name,
                                   napi_async_execute_callback execute,
                                   napi_async_complete_callback complete,
                                   void* data,
                                   napi_async_work* result) {
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  CHECK_ARG(env, execute);
  CHECK_ARG(env, result);

  napi_async_work work = async_work_init(env,
                                         execute,
                                         complete,
                                         data);
  if (work == NULL) {
    return napi_set_last_error(env, napi_generic_failure, 0, NULL);
  }

  *result = work;

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

napi_status napi_delete_async_work(napi_env env, napi_async_work work) {
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  async_work_delete(work);

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

napi_status napi_queue_async_work(napi_env env, napi_async_work work) {
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  async_work_schedule_work(work);

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

#define CALL_UV(env, condition)                                         \
  do {                                                                  \
    int result = (condition);                                           \
    napi_status status = uvimpl::ConvertUVErrorCode(result);            \
    if (status != napi_ok) {                                            \
      return napi_set_last_error(env, status, result);                  \
    }                                                                   \
  } while (0)

napi_status napi_cancel_async_work(napi_env env, napi_async_work work) {
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  int result = async_work_cancel_work(work);
  napi_status status = convert_error_code(async_work_cancel_work(work));
  if (status != napi_ok) {
    return napi_set_last_error(env, status, result, NULL);
  }

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

////////////////////////////////////////////////////////////////////////////////
// TSFN implementation
////////////////////////////////////////////////////////////////////////////////

#if NAPI_VERSION >= 4 && defined(__EMSCRIPTEN_PTHREADS__)

static const unsigned char kDispatchIdle = 0;
static const unsigned char kDispatchRunning = 1 << 0;
static const unsigned char kDispatchPending = 1 << 1;

static const unsigned int kMaxIterationCount = 1000;

struct data_queue_node {
  void* data;
  void* q[2];
};

struct napi_threadsafe_function__ {
  // These are variables protected by the mutex.
  pthread_mutex_t mutex;
  pthread_cond_t* cond;
  size_t queue_size;
  void* queue[2];
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

extern void _emnapi_tsfn_dispatch_one_js(napi_env env, napi_ref ref, napi_threadsafe_function_call_js call_js_cb, void* context, void* data);

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

static napi_threadsafe_function
_emnapi_tsfn_create(napi_env env,
                    napi_ref ref,
                    size_t max_queue_size,
                    size_t initial_thread_count,
                    void* thread_finalize_data,
                    napi_finalize thread_finalize_cb,
                    void* context,
                    napi_threadsafe_function_call_js call_js_cb) {
  napi_threadsafe_function ts_fn =
    (napi_threadsafe_function) malloc(sizeof(struct napi_threadsafe_function__));
  if (ts_fn == NULL) return NULL;

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

  EMNAPI_KEEPALIVE_PUSH();
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

  napi_delete_reference(func->env, func->ref);

  if (func->async_ref) {
    EMNAPI_KEEPALIVE_POP();
    func->async_ref = false;
  }

  free(func);
}

static void _emnapi_tsfn_do_destroy(void* data) {
  napi_threadsafe_function func = (napi_threadsafe_function) data;
  _emnapi_tsfn_destroy(func);
}

// only main thread
static napi_status _emnapi_tsfn_init(napi_threadsafe_function func) {
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
  NEXT_TICK(_emnapi_tsfn_do_destroy, func);
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

static void _emnapi_tsfn_call_finalize_cb(napi_env env, void* args) {
  napi_threadsafe_function func = (napi_threadsafe_function) args;
  func->finalize_cb(env, func->finalize_data, func->context);
}

static void _emnapi_tsfn_finalize(napi_threadsafe_function func) {
  napi_handle_scope scope;
  napi_open_handle_scope(func->env, &scope);
  if (func->finalize_cb) {
    _emnapi_call_into_module(func->env, _emnapi_tsfn_call_finalize_cb, func);
  }
  _emnapi_tsfn_empty_queue_and_delete(func);
  napi_close_handle_scope(func->env, scope);
}

static void _emnapi_tsfn_do_finalize(void* data) {
  napi_threadsafe_function func = (napi_threadsafe_function) data;
  _emnapi_tsfn_finalize(func);
}

static void _emnapi_tsfn_close_handles_and_maybe_delete(
  napi_threadsafe_function func, bool set_closing) {
  napi_handle_scope scope;
  napi_open_handle_scope(func->env, &scope);

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

  NEXT_TICK(_emnapi_tsfn_do_finalize, func);

  napi_close_handle_scope(func->env, scope);
}

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
    _emnapi_tsfn_dispatch_one_js(func->env, func->ref, func->call_js_cb, func->context, data);
  }

  return has_more;
}

static void _emnapi_tsfn_async_cb(void* data);

// all threads
static void _emnapi_tsfn_send(napi_threadsafe_function func) {
  unsigned char current_state =
    atomic_fetch_or(&func->dispatch_state, kDispatchPending);
  if ((current_state & kDispatchRunning) == kDispatchRunning) {
    return;
  }
  _emnapi_async_send(_emnapi_tsfn_async_cb, func);
}

// only main thread
static void _emnapi_tsfn_dispatch(napi_threadsafe_function func) {
  bool has_more = true;

  // Limit maximum synchronous iteration count to prevent event loop
  // starvation. See `src/node_messaging.cc` for an inspiration.
  unsigned int iterations_left = kMaxIterationCount;
  while (has_more && --iterations_left != 0) {
    func->dispatch_state = kDispatchRunning;
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

// only main thread
static void _emnapi_tsfn_async_cb(void* data) {
  napi_threadsafe_function tsfn = (napi_threadsafe_function) data;
  _emnapi_tsfn_dispatch(tsfn);
}

#endif

#if NAPI_VERSION >= 4

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
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  // CHECK_ARG(env, async_resource_name);
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

  napi_threadsafe_function ts_fn = _emnapi_tsfn_create(
    env,
    ref,
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
#ifdef __EMSCRIPTEN_PTHREADS__
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
#ifdef __EMSCRIPTEN_PTHREADS__
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
#ifdef __EMSCRIPTEN_PTHREADS__
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
#ifdef __EMSCRIPTEN_PTHREADS__
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
#ifdef __EMSCRIPTEN_PTHREADS__
  if (func->async_ref) {
    EMNAPI_KEEPALIVE_POP();
    func->async_ref = false;
  }
  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

napi_status
napi_ref_threadsafe_function(napi_env env, napi_threadsafe_function func) {
#ifdef __EMSCRIPTEN_PTHREADS__
  if (!func->async_ref) {
    EMNAPI_KEEPALIVE_PUSH();
    func->async_ref = true;
  }
  return napi_ok;
#else
  return napi_generic_failure;
#endif
}

#endif

EXTERN_C_END
