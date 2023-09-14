#ifdef __EMSCRIPTEN__
#include <stdio.h>
#endif
#include "js_native_api.h"
#include "emnapi.h"
#include "../common.h"

void* malloc(size_t size);
void free(void* p);

#ifdef __EMSCRIPTEN__
static napi_value getModuleObject(napi_env env, napi_callback_info info) {
  napi_value result;
  NODE_API_CALL(env, emnapi_get_module_object(env, &result));

  return result;
}

static napi_value getModuleProperty(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype0;
  NODE_API_CALL(env, napi_typeof(env, args[0], &valuetype0));

  NODE_API_ASSERT(env, valuetype0 == napi_string,
              "Wrong type of arguments. Expects a string as first argument.");

  char name[64] = { 0 };
  NODE_API_CALL(env, napi_get_value_string_utf8(env, args[0], name, 64, NULL));

  napi_value result;
  NODE_API_CALL(env, emnapi_get_module_property(env, name, &result));

  return result;
}

static napi_value testGetEmscriptenVersion(napi_env env, napi_callback_info info) {
  const emnapi_emscripten_version* emscripten_version;
  napi_value result, major, minor, patch;
  NODE_API_CALL(env, emnapi_get_emscripten_version(env, &emscripten_version));
  NODE_API_CALL(env, napi_create_uint32(env, emscripten_version->major, &major));
  NODE_API_CALL(env, napi_create_uint32(env, emscripten_version->minor, &minor));
  NODE_API_CALL(env, napi_create_uint32(env, emscripten_version->patch, &patch));

  NODE_API_CALL(env, napi_create_array_with_length(env, 3, &result));
  NODE_API_CALL(env, napi_set_element(env, result, 0, major));
  NODE_API_CALL(env, napi_set_element(env, result, 1, minor));
  NODE_API_CALL(env, napi_set_element(env, result, 2, patch));
  return result;
}
#endif

static void FinalizeCallback(napi_env env,
                             void* finalize_data,
                             void* finalize_hint)
{
  free(finalize_data);
}

static napi_value External(napi_env env, napi_callback_info info) {
  const uint8_t nElem = 3;
  int8_t* externalData = malloc(nElem*sizeof(int8_t));
  externalData[0] = 0;
  externalData[1] = 1;
  externalData[2] = 2;

  napi_value output_view;
  NODE_API_CALL(env, emnapi_create_memory_view(
      env,
      emnapi_uint8_array,
      externalData,
      nElem*sizeof(int8_t),
      FinalizeCallback,
      NULL,  // finalize_hint
      &output_view));

  return output_view;
}

static napi_value GrowMemory(napi_env env, napi_callback_info info) {
  napi_value result;
  int64_t adjustedValue;

  NODE_API_CALL(env, napi_adjust_external_memory(env, 1, &adjustedValue));
  NODE_API_CALL(env, napi_create_double(env, (double)adjustedValue, &result));

  return result;
}

static napi_value NullArrayBuffer(napi_env env, napi_callback_info info) {
  static void* data = NULL;
  napi_value output_view;
  NODE_API_CALL(env,
      emnapi_create_memory_view(env, emnapi_uint8_array, data, 0, NULL, NULL, &output_view));
  return output_view;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
#ifdef __EMSCRIPTEN__
  const emnapi_emscripten_version* emscripten_version;
  NODE_API_CALL(env, emnapi_get_emscripten_version(env, &emscripten_version));
  printf("Init: Emscripten v%u.%u.%u\n", emscripten_version->major, emscripten_version->minor, emscripten_version->patch);
#endif
  napi_property_descriptor descriptors[] = {
#ifdef __EMSCRIPTEN__
    DECLARE_NODE_API_PROPERTY("getModuleObject", getModuleObject),
    DECLARE_NODE_API_PROPERTY("getModuleProperty", getModuleProperty),
    DECLARE_NODE_API_PROPERTY("testGetEmscriptenVersion", testGetEmscriptenVersion),
#endif
    DECLARE_NODE_API_PROPERTY("External", External),
    DECLARE_NODE_API_PROPERTY("NullArrayBuffer", NullArrayBuffer),
    DECLARE_NODE_API_PROPERTY("GrowMemory", GrowMemory),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
