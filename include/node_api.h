#ifndef SRC_NODE_API_H_
#define SRC_NODE_API_H_

#define NAPI_EXTERN __attribute__((__import_module__("env")))

#include "js_native_api.h"

typedef napi_value (*napi_addon_register_func)(napi_env env,
                                               napi_value exports);

#define NAPI_MODULE_VERSION  1

#define NAPI_MODULE_EXPORT __attribute__((used))

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
  EXTERN_C_END

#endif
