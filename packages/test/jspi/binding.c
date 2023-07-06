#include <node_api.h>
#include <emnapi.h>
#include "../common.h"

#if defined(__EMSCRIPTEN__)
#define WASM_EXPORT __attribute__((used))
#elif defined(__wasm__)
#define WASM_EXPORT __attribute__((visibility("default")))
#else
#define WASM_EXPORT
#endif

WASM_EXPORT
napi_value test_async(napi_env env, napi_callback_info info) {
  size_t args = 1;
  napi_value argv[1];
  napi_value result = NULL;
  int32_t v = 0;
  NAPI_CALL(env, napi_get_cb_info(env, info, &args, argv, NULL, NULL));
  NAPI_CALL(env, emnapi_await(env, argv[0], &result));
  NAPI_CALL(env, napi_get_value_int32(env, result, &v));
  NAPI_CALL(env, napi_create_int32(env, v * 2, &result));
  return result;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor desc = DECLARE_NAPI_PROPERTY("test", test_async);
  NAPI_CALL(env, napi_define_properties(env, exports, 1, &desc));
  return exports;
}
