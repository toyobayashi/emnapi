#include <node_api.h>
// #include <stdlib.h>
#include "../common.h"

void* malloc(size_t size);
void free(void* p);

static napi_value testGetNodeVersion(napi_env env, napi_callback_info info) {
  const napi_node_version* node_version;
  napi_value result, major, minor, patch, release;
  NODE_API_CALL(env, napi_get_node_version(env, &node_version));
  NODE_API_CALL(env, napi_create_uint32(env, node_version->major, &major));
  NODE_API_CALL(env, napi_create_uint32(env, node_version->minor, &minor));
  NODE_API_CALL(env, napi_create_uint32(env, node_version->patch, &patch));
  NODE_API_CALL(env, napi_create_string_utf8(env,
                                         node_version->release,
                                         NAPI_AUTO_LENGTH,
                                         &release));
  NODE_API_CALL(env, napi_create_array_with_length(env, 4, &result));
  NODE_API_CALL(env, napi_set_element(env, result, 0, major));
  NODE_API_CALL(env, napi_set_element(env, result, 1, minor));
  NODE_API_CALL(env, napi_set_element(env, result, 2, patch));
  NODE_API_CALL(env, napi_set_element(env, result, 3, release));
  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    DECLARE_NODE_API_PROPERTY("testGetNodeVersion", testGetNodeVersion),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
