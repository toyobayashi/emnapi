#include <js_native_api.h>
#include <string.h>
#include <stdlib.h>
#include "../common.h"

static napi_value CreateTypedArray(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value args[4];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc == 2 || argc == 4, "Wrong number of arguments");

  napi_value input_array = args[0];
  napi_valuetype valuetype0;
  NAPI_CALL(env, napi_typeof(env, input_array, &valuetype0));

  NAPI_ASSERT(env, valuetype0 == napi_object,
      "Wrong type of arguments. Expects a typed array as first argument.");

  bool is_typedarray;
  NAPI_CALL(env, napi_is_typedarray(env, input_array, &is_typedarray));

  NAPI_ASSERT(env, is_typedarray,
      "Wrong type of arguments. Expects a typed array as first argument.");

  napi_valuetype valuetype1;
  napi_value input_buffer = args[1];
  NAPI_CALL(env, napi_typeof(env, input_buffer, &valuetype1));

  NAPI_ASSERT(env, valuetype1 == napi_object,
      "Wrong type of arguments. Expects an array buffer as second argument.");

  bool is_arraybuffer;
  NAPI_CALL(env, napi_is_arraybuffer(env, input_buffer, &is_arraybuffer));

  NAPI_ASSERT(env, is_arraybuffer,
      "Wrong type of arguments. Expects an array buffer as second argument.");

  napi_typedarray_type type;
  napi_value in_array_buffer;
  size_t byte_offset;
  size_t length;
  NAPI_CALL(env, napi_get_typedarray_info(
      env, input_array, &type, &length, NULL, &in_array_buffer, &byte_offset));

  if (argc == 4) {
    napi_valuetype valuetype2;
    NAPI_CALL(env, napi_typeof(env, args[2], &valuetype2));

    NAPI_ASSERT(env, valuetype2 == napi_number,
        "Wrong type of arguments. Expects a number as third argument.");

    uint32_t uint32_length;
    NAPI_CALL(env, napi_get_value_uint32(env, args[2], &uint32_length));
    length = uint32_length;

    napi_valuetype valuetype3;
    NAPI_CALL(env, napi_typeof(env, args[3], &valuetype3));

    NAPI_ASSERT(env, valuetype3 == napi_number,
        "Wrong type of arguments. Expects a number as third argument.");

    uint32_t uint32_byte_offset;
    NAPI_CALL(env, napi_get_value_uint32(env, args[3], &uint32_byte_offset));
    byte_offset = uint32_byte_offset;
  }

  napi_value output_array;
  NAPI_CALL(env, napi_create_typedarray(
      env, type, length, input_buffer, byte_offset, &output_array));

  return output_array;
}

static napi_value Detach(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments.");

  bool is_typedarray;
  NAPI_CALL(env, napi_is_typedarray(env, args[0], &is_typedarray));
  NAPI_ASSERT(
      env, is_typedarray,
      "Wrong type of arguments. Expects a typedarray as first argument.");

  napi_value arraybuffer;
  NAPI_CALL(env,
      napi_get_typedarray_info(
          env, args[0], NULL, NULL, NULL, &arraybuffer, NULL));
  NAPI_CALL(env, napi_detach_arraybuffer(env, arraybuffer));

  return NULL;
}

static napi_value IsDetached(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments.");

  napi_value array_buffer = args[0];
  bool is_arraybuffer;
  NAPI_CALL(env, napi_is_arraybuffer(env, array_buffer, &is_arraybuffer));
  NAPI_ASSERT(env, is_arraybuffer,
      "Wrong type of arguments. Expects an array buffer as first argument.");

  bool is_detached;
  NAPI_CALL(env,
      napi_is_detached_arraybuffer(env, array_buffer, &is_detached));

  napi_value result;
  NAPI_CALL(env, napi_get_boolean(env, is_detached, &result));

  return result;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    DECLARE_NAPI_PROPERTY("CreateTypedArray", CreateTypedArray),
    DECLARE_NAPI_PROPERTY("Detach", Detach),
    DECLARE_NAPI_PROPERTY("IsDetached", IsDetached)
  };

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
