#include <stdlib.h>

#ifdef __EMSCRIPTEN_PTHREADS__
#include <pthread.h>
#endif

#include <emscripten.h>
#include "emnapi.h"
#include "node_api.h"

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

EXTERN_C_START

extern napi_status napi_set_last_error(napi_env env,
                                       napi_status error_code,
                                       uint32_t engine_error_code,
                                       void* engine_reserved);
extern napi_status napi_clear_last_error(napi_env env);

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
void _emnapi_runtime_init(int* malloc_p,
                         int* free_p,
                         const char** key,
                         const char*** error_messages) {
  if (malloc_p) *malloc_p = (int)(malloc);
  if (free_p) *free_p = (int)(free);
  if (key) {
    *key = EMNAPI_MOD_NAME_X(NODE_GYP_MODULE_NAME);
  }
  if (error_messages) *error_messages = emnapi_error_messages;
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

#ifdef __EMSCRIPTEN_PTHREADS__

struct napi_async_work__ {
  napi_env env;
  napi_async_execute_callback execute;
  napi_async_complete_callback complete;
  void* data;
  pthread_t tid;
};

typedef struct worker_count {
  int unused;
  int running;
} worker_count;

// extern void _emnapi_create_async_work_js(napi_async_work work);
// extern void _emnapi_delete_async_work_js(napi_async_work work);
extern void _emnapi_queue_async_work_js(napi_async_work work);
extern void _emnapi_on_execute_async_work_js(napi_async_work work);
extern int _emnapi_get_worker_count_js(worker_count* count);

napi_async_work _emnapi_async_work_init(
  napi_env env,
  napi_async_execute_callback execute,
  napi_async_complete_callback complete,
  void* data
) {
  napi_async_work work = (napi_async_work)malloc(sizeof(struct napi_async_work__));
  work->env = env;
  work->execute = execute;
  work->complete = complete;
  work->data = data;
  work->tid = NULL;
  return work;
}

void _emnapi_async_work_destroy(napi_async_work work) {
  free(work);
}

void* _emnapi_on_execute_async_work(void* arg) {
  napi_async_work work = (napi_async_work) arg;
  work->execute(work->env, work->data);
  _emnapi_on_execute_async_work_js(work);  // postMessage to main thread
  return NULL;
}
#endif

EMSCRIPTEN_KEEPALIVE
void _emnapi_execute_async_work(napi_async_work work) {
#ifdef __EMSCRIPTEN_PTHREADS__
  pthread_t t;
  pthread_create(&t, NULL, _emnapi_on_execute_async_work, work);
  work->tid = t;
  _emnapi_queue_async_work_js(work);  // listen complete event
  pthread_detach(t);
#endif
}

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

  napi_async_work work = _emnapi_async_work_init(env, execute, complete, data);
  // _emnapi_create_async_work_js(work); // listen complete event
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

  // _emnapi_delete_async_work_js(work);  // clean listeners
  _emnapi_async_work_destroy(work);
  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

napi_status napi_queue_async_work(napi_env env, napi_async_work work) {
#ifdef __EMSCRIPTEN_PTHREADS__
  CHECK_ENV(env);
  CHECK_ARG(env, work);

  worker_count count;
  _emnapi_get_worker_count_js(&count);
  if (count.unused > 0 || count.running == 0) {
    _emnapi_execute_async_work(work);
  } else {
    _emnapi_queue_async_work_js(work);  // queue work
  }

  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

EXTERN_C_END
