#ifndef SRC_NODE_API_H_
#define SRC_NODE_API_H_

#include <stdlib.h>
#include "js_native_api.h"

#define NAPI_MODULE_EXPORT __attribute__((used))
#define NAPI_NO_RETURN __attribute__((__noreturn__))

typedef napi_value (*napi_addon_register_func)(napi_env env,
                                               napi_value exports);

#define NAPI_MODULE_VERSION  1

#ifndef NODE_GYP_MODULE_NAME
#define NODE_GYP_MODULE_NAME emnapiExports
#endif

#define EMNAPI_MOD_NAME_X(modname) #modname

#define NAPI_MODULE_INITIALIZER_X(base, version)                               \
  NAPI_MODULE_INITIALIZER_X_HELPER(base, version)
#define NAPI_MODULE_INITIALIZER_X_HELPER(base, version) base##version

#define NAPI_WASM_INITIALIZER                                                  \
  NAPI_MODULE_INITIALIZER_X(napi_register_wasm_v, NAPI_MODULE_VERSION)
#define NAPI_MODULE(modname, regfunc)                                          \
  EXTERN_C_START                                                               \
  NAPI_MODULE_EXPORT void emnapi_runtime_init(int* malloc_p,                   \
                                              int* free_p,                     \
                                              const char** key,                \
                                              const char*** error_messages) {  \
    if (malloc_p) *malloc_p = (int)(malloc);                                   \
    if (free_p) *free_p = (int)(free);                                         \
    if (key) {                                                                 \
      *key = EMNAPI_MOD_NAME_X(modname);                                       \
    }                                                                          \
    if (error_messages) *error_messages = emnapi_error_messages;               \
  }                                                                            \
  NAPI_MODULE_EXPORT napi_value NAPI_WASM_INITIALIZER(napi_env env,            \
                                                      napi_value exports) {    \
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

typedef struct {
  uint32_t major;
  uint32_t minor;
  uint32_t patch;
  const char* release;
} napi_node_version;

EXTERN_C_START

extern const char* emnapi_error_messages[22];

NAPI_EXTERN NAPI_NO_RETURN void napi_fatal_error(const char* location,
                                                 size_t location_len,
                                                 const char* message,
                                                 size_t message_len);

NAPI_EXTERN
napi_status napi_get_node_version(napi_env env,
                                  const napi_node_version** version);

EXTERN_C_END

#endif
