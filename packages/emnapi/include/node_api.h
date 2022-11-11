#ifndef SRC_NODE_API_H_
#define SRC_NODE_API_H_

#include <stdlib.h>
#include "js_native_api.h"
#include "node_api_types.h"

#define NAPI_MODULE_EXPORT __attribute__((used))
#define NAPI_NO_RETURN __attribute__((__noreturn__))

typedef napi_value (*napi_addon_register_func)(napi_env env,
                                               napi_value exports);

#define NAPI_MODULE_VERSION  1

#ifndef NODE_GYP_MODULE_NAME
#define NODE_GYP_MODULE_NAME emnapiExports
#endif

#define NAPI_MODULE_INITIALIZER_X(base, version)                               \
  NAPI_MODULE_INITIALIZER_X_HELPER(base, version)
#define NAPI_MODULE_INITIALIZER_X_HELPER(base, version) base##version

#define NAPI_WASM_INITIALIZER                                                  \
  NAPI_MODULE_INITIALIZER_X(napi_register_wasm_v, NAPI_MODULE_VERSION)
#define NAPI_MODULE(modname, regfunc)                                          \
  EXTERN_C_START                                                               \
  void _emnapi_runtime_init(const char** k, const char*** msg, int* size);     \
  void _emnapi_execute_async_work(napi_async_work work);                       \
  NAPI_MODULE_EXPORT napi_value NAPI_WASM_INITIALIZER(napi_env env,            \
                                                      napi_value exports) {    \
    _emnapi_runtime_init(NULL, NULL, NULL);                                    \
    _emnapi_execute_async_work(NULL);                                          \
    return regfunc(env, exports);                                              \
  }                                                                            \
  EXTERN_C_END

#define NAPI_MODULE_INITIALIZER_BASE napi_register_module_v

#define NAPI_MODULE_INITIALIZER                                       \
  NAPI_MODULE_INITIALIZER_X(NAPI_MODULE_INITIALIZER_BASE,             \
      NAPI_MODULE_VERSION)

#define NAPI_MODULE_INIT()                                            \
  EXTERN_C_START                                                      \
  NAPI_MODULE_EXPORT napi_value                                       \
  NAPI_MODULE_INITIALIZER(napi_env env, napi_value exports);          \
  EXTERN_C_END                                                        \
  NAPI_MODULE(NODE_GYP_MODULE_NAME, NAPI_MODULE_INITIALIZER)          \
  napi_value NAPI_MODULE_INITIALIZER(napi_env env,                    \
                                     napi_value exports)


EXTERN_C_START

NAPI_EXTERN
napi_status napi_create_async_work(napi_env env,
                                   napi_value async_resource,
                                   napi_value async_resource_name,
                                   napi_async_execute_callback execute,
                                   napi_async_complete_callback complete,
                                   void* data,
                                   napi_async_work* result);
NAPI_EXTERN napi_status napi_delete_async_work(napi_env env,
                                               napi_async_work work);
NAPI_EXTERN napi_status napi_queue_async_work(napi_env env,
                                              napi_async_work work);
NAPI_EXTERN napi_status napi_cancel_async_work(napi_env env,
                                               napi_async_work work);

NAPI_EXTERN NAPI_NO_RETURN void napi_fatal_error(const char* location,
                                                 size_t location_len,
                                                 const char* message,
                                                 size_t message_len);

NAPI_EXTERN
napi_status napi_get_node_version(napi_env env,
                                  const napi_node_version** version);

#if NAPI_VERSION >= 4

#if !defined(__wasm32__) || defined(__EMSCRIPTEN__)
// Calling into JS from other threads
NAPI_EXTERN napi_status
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
                                napi_threadsafe_function* result);

NAPI_EXTERN napi_status
napi_get_threadsafe_function_context(napi_threadsafe_function func,
                                     void** result);

NAPI_EXTERN napi_status
napi_call_threadsafe_function(napi_threadsafe_function func,
                              void* data,
                              napi_threadsafe_function_call_mode is_blocking);

NAPI_EXTERN napi_status
napi_acquire_threadsafe_function(napi_threadsafe_function func);

NAPI_EXTERN napi_status
napi_release_threadsafe_function(napi_threadsafe_function func,
                                 napi_threadsafe_function_release_mode mode);

NAPI_EXTERN napi_status
napi_unref_threadsafe_function(napi_env env, napi_threadsafe_function func);

NAPI_EXTERN napi_status
napi_ref_threadsafe_function(napi_env env, napi_threadsafe_function func);

#endif

#endif

EXTERN_C_END

#endif
