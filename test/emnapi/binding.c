#include <stdlib.h>
#include "js_native_api.h"
#include "emnapi.h"
#include "../common.h"

static napi_value getModuleObject(napi_env env, napi_callback_info info) {
  napi_value result;
  NAPI_CALL(env, emnapi_get_module_object(env, &result));

  return result;
}

static napi_value getModuleProperty(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype0;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype0));

  NAPI_ASSERT(env, valuetype0 == napi_string,
              "Wrong type of arguments. Expects a string as first argument.");

  char name[64] = { 0 };
  NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], name, 64, NULL));

  napi_value result;
  NAPI_CALL(env, emnapi_get_module_property(env, name, &result));

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

  napi_value output_array;
  NAPI_CALL(env, emnapi_create_external_uint8array(
      env,
      externalData,
      nElem*sizeof(int8_t),
      FinalizeCallback,
      NULL,  // finalize_hint
      &output_array));

  return output_array;
}


static napi_value NullArrayBuffer(napi_env env, napi_callback_info info) {
  static void* data = NULL;
  napi_value output_array;
  NAPI_CALL(env,
      emnapi_create_external_uint8array(env, data, 0, NULL, NULL, &output_array));
  return output_array;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    DECLARE_NAPI_PROPERTY("getModuleObject", getModuleObject),
    DECLARE_NAPI_PROPERTY("getModuleProperty", getModuleProperty),
    DECLARE_NAPI_PROPERTY("External", External),
    DECLARE_NAPI_PROPERTY("NullArrayBuffer", NullArrayBuffer)
  };

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
