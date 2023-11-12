#ifdef __EMSCRIPTEN__
#include <stdio.h>
#endif
#include "js_native_api.h"
#include "emnapi.h"
#include "../common.h"
#include "../entry_point.h"

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
#endif

static napi_value testGetRuntimeVersion(napi_env env, napi_callback_info info) {
  emnapi_runtime_version runtime_version;
  napi_value result, major, minor, patch;
  NODE_API_CALL(env, emnapi_get_runtime_version(env, &runtime_version));
  NODE_API_CALL(env, napi_create_uint32(env, runtime_version.major, &major));
  NODE_API_CALL(env, napi_create_uint32(env, runtime_version.minor, &minor));
  NODE_API_CALL(env, napi_create_uint32(env, runtime_version.patch, &patch));

  NODE_API_CALL(env, napi_create_array_with_length(env, 3, &result));
  NODE_API_CALL(env, napi_set_element(env, result, 0, major));
  NODE_API_CALL(env, napi_set_element(env, result, 1, minor));
  NODE_API_CALL(env, napi_set_element(env, result, 2, patch));
  return result;
}

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
  size_t argc = 1;
  napi_value result, change_in_bytes_value;
  int64_t adjustedValue, change_in_bytes;

  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, &change_in_bytes_value, NULL, NULL));
  NODE_API_CALL(env, napi_get_value_int64(env, change_in_bytes_value, &change_in_bytes));
  NODE_API_CALL(env, napi_adjust_external_memory(env, change_in_bytes, &adjustedValue));
  NODE_API_CALL(env, napi_create_double(env, (double)adjustedValue, &result));

  return result;
}

static napi_value GetWasmMemorySize(napi_env env, napi_callback_info info) {
  napi_value result;
  size_t wasm_memory_size = __builtin_wasm_memory_size(0) << 16;
  NODE_API_CALL(env, napi_create_bigint_uint64(env, wasm_memory_size, &result));

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
  napi_property_descriptor descriptors[] = {
#ifdef __EMSCRIPTEN__
    DECLARE_NODE_API_PROPERTY("getModuleObject", getModuleObject),
    DECLARE_NODE_API_PROPERTY("getModuleProperty", getModuleProperty),
#endif
    DECLARE_NODE_API_PROPERTY("testGetRuntimeVersion", testGetRuntimeVersion),
    DECLARE_NODE_API_PROPERTY("External", External),
    DECLARE_NODE_API_PROPERTY("NullArrayBuffer", NullArrayBuffer),
    DECLARE_NODE_API_PROPERTY("GrowMemory", GrowMemory),
    DECLARE_NODE_API_PROPERTY("GetWasmMemorySize", GetWasmMemorySize),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
