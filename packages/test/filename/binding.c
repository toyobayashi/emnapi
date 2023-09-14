#define NAPI_EXPERIMENTAL
#include <node_api.h>
#include "../common.h"
#include "../entry_point.h"

static napi_value GetFilename(napi_env env, napi_callback_info info) {
  const char* filename;
  napi_value result;

  NODE_API_CALL(env, node_api_get_module_file_name(env, &filename));
  NODE_API_CALL(env,
      napi_create_string_utf8(env, filename, NAPI_AUTO_LENGTH, &result));

  return result;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    DECLARE_NODE_API_PROPERTY("filename", GetFilename)
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
