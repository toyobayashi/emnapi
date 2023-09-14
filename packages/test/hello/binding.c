#include <node_api.h>
#include "../common.h"

static napi_value Method(napi_env env, napi_callback_info info) {
  napi_value world;
  const char* str = "world";
  NODE_API_CALL(env, napi_create_string_utf8(env, str, 5, &world));
  return world;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor desc = DECLARE_NODE_API_PROPERTY("hello", Method);
  NODE_API_CALL(env, napi_define_properties(env, exports, 1, &desc));
  return exports;
}
