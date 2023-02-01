#include <assert.h>
#include <stdlib.h>

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
#include <pthread.h>

#include <errno.h>
#include "uv.h"
#endif

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/heap.h>

#if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30114  // NOLINT
#include <emscripten/eventloop.h>
#endif
#endif

#include "emnapi.h"
#include "node_api.h"

#if NAPI_VERSION >= 4 && (defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT))
#include <stdatomic.h>
#include "uv/queue.h"
#endif

#ifdef NDEBUG
#define	EMNAPI_ASSERT_CALL(the_call) (the_call)
#else
#define EMNAPI_ASSERT_CALL(the_call) (assert(napi_ok == (the_call)))
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
#define CHECK_LE(a, b) CHECK((a) <= (b))

EXTERN_C_START

EMNAPI_INTERNAL_EXTERN napi_status napi_set_last_error(napi_env env,
                                       napi_status error_code,
                                       uint32_t engine_error_code,
                                       void* engine_reserved);
EMNAPI_INTERNAL_EXTERN napi_status napi_clear_last_error(napi_env env);

#ifdef __EMSCRIPTEN__
#if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30114  // NOLINT
#define EMNAPI_KEEPALIVE_PUSH emscripten_runtime_keepalive_push
#define EMNAPI_KEEPALIVE_POP emscripten_runtime_keepalive_pop
#else

EMNAPI_INTERNAL_EXTERN void _emnapi_runtime_keepalive_push();
EMNAPI_INTERNAL_EXTERN void _emnapi_runtime_keepalive_pop();

#define EMNAPI_KEEPALIVE_PUSH _emnapi_runtime_keepalive_push
#define EMNAPI_KEEPALIVE_POP _emnapi_runtime_keepalive_pop
#endif
#else
EMNAPI_INTERNAL_EXTERN void _emnapi_runtime_keepalive_push();
EMNAPI_INTERNAL_EXTERN void _emnapi_runtime_keepalive_pop();

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
  "External buffers are not allowed"
};

EMNAPI_INTERNAL_EXTERN void _emnapi_get_last_error_info(napi_env env,
                                        napi_status* error_code,
                                        uint32_t* engine_error_code,
                                        void** engine_reserved);

napi_status napi_get_last_error_info(
    napi_env env, const napi_extended_error_info** result) {
  static napi_extended_error_info last_error;
  CHECK_ENV(env);
  CHECK_ARG(env, result);

  const int last_status = napi_no_external_buffers_allowed;

  _Static_assert((sizeof(emnapi_error_messages) / sizeof(const char*)) == napi_no_external_buffers_allowed + 1,
                "Count of error messages must match count of error values");
  
  _emnapi_get_last_error_info(env,
                              &last_error.error_code,
                              &last_error.engine_error_code,
                              &last_error.engine_reserved);

  CHECK_LE(last_error.error_code, last_status);

  last_error.error_message = emnapi_error_messages[last_error.error_code];

  if (last_error.error_code == napi_ok) {
    napi_clear_last_error(env);
    last_error.engine_error_code = 0;
    last_error.engine_reserved = NULL;
  }
  *result = &last_error;
  return napi_ok;
}

#ifdef __EMSCRIPTEN__
napi_status napi_adjust_external_memory(napi_env env,
                                        int64_t change_in_bytes,
                                        int64_t* adjusted_value) {
  CHECK_ENV(env);
  CHECK_ARG(env, adjusted_value);

  if (change_in_bytes < 0) {
    return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
  }

  size_t old_size = emscripten_get_heap_size();
  if (!emscripten_resize_heap(old_size + (size_t) change_in_bytes)) {
    return napi_set_last_error(env, napi_generic_failure, 0, NULL);
  }

  *adjusted_value = (int64_t) emscripten_get_heap_size();

  return napi_clear_last_error(env);
}
#endif

napi_status napi_get_version(napi_env env, uint32_t* result) {
  CHECK_ENV(env);
  CHECK_ARG(env, result);
  *result = NAPI_VERSION;
  return napi_clear_last_error(env);
}

EMNAPI_INTERNAL_EXTERN void _emnapi_get_node_version(uint32_t* major,
                                     uint32_t* minor,
                                     uint32_t* patch);

napi_status
napi_get_node_version(napi_env env,
                      const napi_node_version** version) {
  CHECK_ENV(env);
  CHECK_ARG(env, version);
  static napi_node_version node_version = {
    0,
    0,
    0,
    "node"
  };
  _emnapi_get_node_version(&node_version.major,
                           &node_version.minor,
                           &node_version.patch);
  *version = &node_version;
  return napi_clear_last_error(env);
}

#ifdef __EMSCRIPTEN__
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
#endif

napi_status napi_get_uv_event_loop(napi_env env,
                                   struct uv_loop_s** loop) {
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
  CHECK_ENV(env);
  CHECK_ARG(env, loop);
  // Though this is fake libuv loop
  *loop = uv_default_loop();
  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

EMNAPI_INTERNAL_EXTERN int _emnapi_get_filename(char* buf, int len);

napi_status node_api_get_module_file_name(napi_env env,
                                          const char** result) {
  CHECK_ENV(env);
  CHECK_ARG(env, result);

  static char* filename = NULL;
  static const char* empty_string = "";

  if (filename != NULL) {
    free(filename);
    filename = NULL;
  }

  int len = _emnapi_get_filename(NULL, 0);
  if (len == 0) {
    *result = empty_string;
  } else {
    filename = (char*) malloc(len + 1);
    len = _emnapi_get_filename(filename, len + 1);
    *(filename + len) = '\0';
    *result = filename;
  }

  return napi_clear_last_error(env);
}

EMNAPI_INTERNAL_EXTERN void _emnapi_env_ref(napi_env env);
EMNAPI_INTERNAL_EXTERN void _emnapi_env_unref(napi_env env);
EMNAPI_INTERNAL_EXTERN void _emnapi_ctx_increase_waiting_request_counter();
EMNAPI_INTERNAL_EXTERN void _emnapi_ctx_decrease_waiting_request_counter();

struct napi_async_context__ {
  int32_t low;
  int32_t high;
};

EMNAPI_INTERNAL_EXTERN napi_status
_emnapi_async_init_js(napi_value async_resource,
                      napi_value async_resource_name,
                      napi_async_context result);
EMNAPI_INTERNAL_EXTERN napi_status
_emnapi_async_destroy_js(napi_async_context async_context);

napi_status
napi_async_init(napi_env env,
                napi_value async_resource,
                napi_value async_resource_name,
                napi_async_context* result) {
  CHECK_ENV(env);
  CHECK_ARG(env, async_resource_name);
  CHECK_ARG(env, result);

  napi_async_context ret = (napi_async_context) malloc(sizeof(struct napi_async_context__));

  napi_status status = _emnapi_async_init_js(async_resource, async_resource_name, ret);
  if (status != napi_ok) {
    free(ret);
    return napi_set_last_error(env, status, 0, NULL);
  }

  *result = ret;
  return napi_clear_last_error(env);
}

napi_status napi_async_destroy(napi_env env,
                               napi_async_context async_context) {
  CHECK_ENV(env);
  CHECK_ARG(env, async_context);

  napi_status status = _emnapi_async_destroy_js(async_context);
  if (status != napi_ok) {
    return napi_set_last_error(env, status, 0, NULL);
  }
  free(async_context);

  return napi_clear_last_error(env);
}

////////////////////////////////////////////////////////////////////////////////
// Async work implementation
////////////////////////////////////////////////////////////////////////////////

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#define container_of(ptr, type, member) \
  ((type *) ((char *) (ptr) - offsetof(type, member)))

typedef void (*_emnapi_call_into_module_callback)(napi_env env, void* args);
EMNAPI_INTERNAL_EXTERN void _emnapi_call_into_module(napi_env env, _emnapi_call_into_module_callback callback, void* args, int close_scope_if_throw);

typedef double async_id;
typedef struct async_context {
  async_id async_id;
  async_id trigger_async_id;
} async_context;

// call node::EmitAsyncInit
EMNAPI_INTERNAL_EXTERN void _emnapi_node_emit_async_init(napi_value async_resource,
                                         napi_value async_resource_name,
                                         async_id trigger_async_id,
                                         async_context* result);
// call node::EmitAsyncDestroy
EMNAPI_INTERNAL_EXTERN void _emnapi_node_emit_async_destroy(async_id id, async_id trigger_async_id);

// EMNAPI_INTERNAL_EXTERN void _emnapi_node_open_callback_scope(napi_value async_resource, async_id id, async_id trigger_async_id, int64_t* result);
// EMNAPI_INTERNAL_EXTERN void _emnapi_node_close_callback_scope(int64_t* scope);

// call node:MakeCallback
EMNAPI_INTERNAL_EXTERN napi_status _emnapi_node_make_callback(napi_env env,
                                              napi_value async_resource,
                                              napi_value cb,
                                              napi_value* argv,
                                              size_t size,
                                              double async_id,
                                              double trigger_async_id,
                                              napi_value* result);

#define ASYNC_RESOURCE_FIELD             \
  napi_ref resource_;                    \
  async_context async_context_;

typedef struct emnapi_async_resource {
  ASYNC_RESOURCE_FIELD
} emnapi_async_resource;

struct napi_async_work__ {
  ASYNC_RESOURCE_FIELD
  uv_work_t work_req_;
  napi_env env;
  void* data;
  napi_async_execute_callback execute;
  napi_async_complete_callback complete;
};

static void _emnapi_async_resource_ctor(napi_env env,
                                        napi_value resource,
                                        napi_value resource_name,
                                        emnapi_async_resource* ar) {
  EMNAPI_ASSERT_CALL(napi_create_reference(env, resource, 1, &ar->resource_));
  _emnapi_node_emit_async_init(resource, resource_name, -1.0, &ar->async_context_);
}

static void _emnapi_async_resource_dtor(napi_env env, emnapi_async_resource* ar) {
  EMNAPI_ASSERT_CALL(napi_delete_reference(env, ar->resource_));
  _emnapi_node_emit_async_destroy(ar->async_context_.async_id,
                                  ar->async_context_.trigger_async_id);
}

static napi_async_work async_work_init(
  napi_env env,
  napi_value async_resource,
  napi_value async_resource_name,
  napi_async_execute_callback execute,
  napi_async_complete_callback complete,
  void* data
) {
  napi_async_work work = (napi_async_work)calloc(1, sizeof(struct napi_async_work__));
  if (work == NULL) return NULL;
  _emnapi_async_resource_ctor(env, async_resource, async_resource_name, (emnapi_async_resource*)work);
  work->env = env;
  work->execute = execute;
  work->complete = complete;
  work->data = data;
  return work;
}

static void async_work_delete(napi_async_work work) {
  _emnapi_async_resource_dtor(work->env, (emnapi_async_resource*)work);
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
  napi_status status = convert_error_code(wrap->status);
  napi_async_work work = wrap->work;
  free(wrap);
  napi_env _env = work->env;
  void* data = work->data;
  work->complete(_env, status, data);
}

static napi_value async_work_after_cb(napi_env env, napi_callback_info info) {
  void* data = NULL;
  EMNAPI_ASSERT_CALL(napi_get_cb_info(env, info, NULL, NULL, NULL, &data));
  complete_wrap_t* wrap = (complete_wrap_t*) data;
  _emnapi_call_into_module(env, async_work_on_complete, wrap, 1);
  return NULL;
}

static void async_work_after_thread_pool_work(napi_async_work work, int status) {
  if (work->complete == NULL) return;
  napi_handle_scope scope;
  napi_value resource, cb;
  napi_env env = work->env;
  EMNAPI_ASSERT_CALL(napi_open_handle_scope(env, &scope));
  EMNAPI_ASSERT_CALL(napi_get_reference_value(env, work->resource_, &resource));
  complete_wrap_t* wrap = (complete_wrap_t*) malloc(sizeof(complete_wrap_t));
  assert(wrap != NULL);
  wrap->status = status;
  wrap->work = work;
  if (emnapi_is_node_binding_available()) {
    EMNAPI_ASSERT_CALL(napi_create_function(env, NULL, 0, async_work_after_cb, wrap, &cb));
    _emnapi_node_make_callback(env,
                              resource,
                              cb,
                              NULL,
                              0,
                              work->async_context_.async_id,
                              work->async_context_.trigger_async_id,
                              NULL);
  } else {
    _emnapi_call_into_module(env, async_work_on_complete, wrap, 1);
  }
  EMNAPI_ASSERT_CALL(napi_close_handle_scope(env, scope));
}

static void async_work_schedule_work_on_execute(uv_work_t* req) {
  napi_async_work self = container_of(req, struct napi_async_work__, work_req_);
  async_work_do_thread_pool_work(self);
}

static void async_work_schedule_work_on_complete(uv_work_t* req, int status) {
  napi_async_work self = container_of(req, struct napi_async_work__, work_req_);
  EMNAPI_KEEPALIVE_POP();
  _emnapi_ctx_decrease_waiting_request_counter();
  async_work_after_thread_pool_work(self, status);
}

static void async_work_schedule_work(napi_async_work work) {
  EMNAPI_KEEPALIVE_PUSH();
  _emnapi_ctx_increase_waiting_request_counter();
  int status = uv_queue_work(uv_default_loop(),
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
  CHECK_ENV(env);
  CHECK_ARG(env, execute);
  CHECK_ARG(env, result);

  napi_status status;
  napi_value resource;
  napi_value resource_name;
  if (async_resource != NULL) {
    status = napi_coerce_to_object(env, async_resource, &resource);
    if (status != napi_ok) return status;
  } else {
    status = napi_create_object(env, &resource);
    if (status != napi_ok) return status;
  }

  CHECK_ARG(env, async_resource_name);
  status = napi_coerce_to_string(env, async_resource_name, &resource_name);
  if (status != napi_ok) return status;

  napi_async_work work = async_work_init(env,
                                         resource,
                                         resource_name,
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  async_work_delete(work);

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

napi_status napi_queue_async_work(napi_env env, napi_async_work work) {
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
    napi_status status = convert_error_code(result);                    \
    if (status != napi_ok) {                                            \
      return napi_set_last_error(env, status, result, NULL);            \
    }                                                                   \
  } while (0)

napi_status napi_cancel_async_work(napi_env env, napi_async_work work) {
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  CALL_UV(env, async_work_cancel_work(work));

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

////////////////////////////////////////////////////////////////////////////////
// TSFN implementation
////////////////////////////////////////////////////////////////////////////////

#if NAPI_VERSION >= 4 && (defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT))

EMNAPI_INTERNAL_EXTERN void _emnapi_call_finalizer(napi_env env, napi_finalize cb, void* data, void* hint);

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
  _emnapi_async_resource_ctor(env, async_resource, async_resource_name, (emnapi_async_resource*) ts_fn);
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

  _emnapi_async_resource_dtor(func->env, (emnapi_async_resource*) func);
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
  _emnapi_call_finalizer(func->env, func->finalize_cb, func->finalize_data, func->context);
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
      _emnapi_call_finalizer(func->env, func->finalize_cb, func->finalize_data, func->context);
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
  _emnapi_call_into_module(env, _emnapi_tsfn_call_js_cb, data, 1);
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
      _emnapi_call_into_module(func->env, _emnapi_tsfn_call_js_cb, jscb_data, 1);
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
  uv_async_send(&func->async);
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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

  napi_value resource;
  napi_value resource_name;
  if (async_resource != NULL) {
    status = napi_coerce_to_object(env, async_resource, &resource);
    if (status != napi_ok) return status;
  } else {
    status = napi_create_object(env, &resource);
    if (status != napi_ok) return status;
  }

  CHECK_ARG(env, async_resource_name);
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
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

#endif

////////////////////////////////////////////////////////////////////////////////
// Async cleanup hook implementation
////////////////////////////////////////////////////////////////////////////////

#if NAPI_VERSION >= 8

typedef void (*async_cleanup_hook)(void* arg, void(*)(void*), void*);

struct async_cleanup_hook_info {
  napi_env env;
  async_cleanup_hook fun;
  void* arg;
  bool started;
};

struct napi_async_cleanup_hook_handle__ {
  struct async_cleanup_hook_info* handle_;
  napi_env env_;
  napi_async_cleanup_hook user_hook_;
  void* user_data_;
  void (*done_cb_)(void*);
  void* done_data_;
};

static void _emnapi_ach_handle_hook(void* data, void (*done_cb)(void*), void* done_data) {
  napi_async_cleanup_hook_handle handle =
      (napi_async_cleanup_hook_handle) (data);
  handle->done_cb_ = done_cb;
  handle->done_data_ = done_data;
  handle->user_hook_(handle, handle->user_data_);
}

static void _emnapi_finish_async_cleanup_hook(void* arg) {
  // struct async_cleanup_hook_info* info = (struct async_cleanup_hook_info*) (arg);
  EMNAPI_KEEPALIVE_POP();
  _emnapi_ctx_decrease_waiting_request_counter();
}

static void _emnapi_run_async_cleanup_hook(void* arg) {
  struct async_cleanup_hook_info* info = (struct async_cleanup_hook_info*) (arg);
  EMNAPI_KEEPALIVE_PUSH();
  _emnapi_ctx_increase_waiting_request_counter();
  info->started = true;
  info->fun(info->arg, _emnapi_finish_async_cleanup_hook, info);
}

static struct async_cleanup_hook_info*
_emnapi_add_async_environment_cleanup_hook(napi_env env,
                                           async_cleanup_hook fun,
                                           void* arg) {
  struct async_cleanup_hook_info* info =
    (struct async_cleanup_hook_info*) malloc(sizeof(struct async_cleanup_hook_info));
  info->env = env;
  info->fun = fun;
  info->arg = arg;
  info->started = false;

  EMNAPI_ASSERT_CALL(napi_add_env_cleanup_hook(env, _emnapi_run_async_cleanup_hook, info));

  return info;
}

static void _emnapi_remove_async_environment_cleanup_hook(
    struct async_cleanup_hook_info* info) {
  if (info->started) return;
  EMNAPI_ASSERT_CALL(napi_remove_env_cleanup_hook(info->env, _emnapi_run_async_cleanup_hook, info));
}

static napi_async_cleanup_hook_handle
_emnapi_ach_handle_create(napi_env env,
                          napi_async_cleanup_hook user_hook,
                          void* user_data) {
  napi_async_cleanup_hook_handle handle =
    (napi_async_cleanup_hook_handle) calloc(1, sizeof(struct napi_async_cleanup_hook_handle__));
  handle->env_ = env;
  handle->user_hook_ = user_hook;
  handle->user_data_ = user_data;
  handle->handle_ = _emnapi_add_async_environment_cleanup_hook(env, _emnapi_ach_handle_hook, handle);
  _emnapi_env_ref(env);

  return handle;
}

EMNAPI_INTERNAL_EXTERN void _emnapi_set_immediate(void (*callback)(void*), void* data);

static void _emnapi_ach_handle_env_unref(void* arg) {
  napi_env env = (napi_env) arg;
  _emnapi_env_unref(env);
}

static void
_emnapi_ach_handle_delete(napi_async_cleanup_hook_handle handle) {
  _emnapi_remove_async_environment_cleanup_hook(handle->handle_);
  if (handle->done_cb_ != NULL) handle->done_cb_(handle->done_data_);

  _emnapi_set_immediate(_emnapi_ach_handle_env_unref, handle->env_);

  free(handle->handle_);
  free(handle);
}

napi_status
napi_add_async_cleanup_hook(napi_env env,
                            napi_async_cleanup_hook hook,
                            void* arg,
                            napi_async_cleanup_hook_handle* remove_handle) {
  CHECK_ENV(env);
  CHECK_ARG(env, hook);

  napi_async_cleanup_hook_handle handle =
      _emnapi_ach_handle_create(env, hook, arg);

  if (remove_handle != NULL) *remove_handle = handle;

  return napi_clear_last_error(env);
}

napi_status
napi_remove_async_cleanup_hook(napi_async_cleanup_hook_handle remove_handle) {
  if (remove_handle == NULL) return napi_invalid_arg;

  _emnapi_ach_handle_delete(remove_handle);

  return napi_ok;
}

#endif

EXTERN_C_END
