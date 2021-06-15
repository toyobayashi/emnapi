#ifndef SRC_NODE_API_H_
#define SRC_NODE_API_H_

#include "js_native_api.h"

#define NAPI_MODULE_EXPORT __attribute__((used))

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
  NAPI_MODULE_EXPORT napi_value NAPI_WASM_INITIALIZER(napi_env env,            \
                                                      napi_value exports) {    \
    return regfunc(env, exports);                                              \
  }                                                                            \
  NAPI_MODULE_EXPORT const char* emnapi_module_key() {                         \
    return EMNAPI_MOD_NAME_X(modname);                                         \
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

EXTERN_C_END

#endif
