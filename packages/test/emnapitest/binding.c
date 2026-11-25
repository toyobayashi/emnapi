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

static napi_value TestUint64(napi_env env, napi_callback_info info) {
  uint64_t input = 10823190267204339845ULL;

  napi_value output;
  NODE_API_CALL(env, napi_create_bigint_uint64(env, input, &output));

  return output;
}

static napi_value CreateArrayBufferCopy(napi_env env, napi_callback_info info) {
  uint8_t src[4] = { 10, 20, 30, 40 };
  napi_value ab;
  NODE_API_CALL(env, emnapi_create_arraybuffer_copy(env, src, sizeof(src), &ab));

  // Mutate the wasm source immediately; the returned ArrayBuffer must keep the
  // original copied bytes.
  src[0] = 99;
  src[3] = 88;

  // Must NOT register a wasm mirror in emnapiExternalMemory.table.
  void* address = (void*)1;
  bool runtime_allocated = true;
  emnapi_ownership ownership = emnapi_userland;
  NODE_API_CALL(env, emnapi_get_memory_address(env, ab, &address, &ownership, &runtime_allocated));
  NODE_API_ASSERT(env, address == NULL, "emnapi_create_arraybuffer_copy must not register a wasm address");
  NODE_API_ASSERT(env, !runtime_allocated, "emnapi_create_arraybuffer_copy must not allocate a wasm mirror");

  return ab;
}

static napi_value CreateArrayBufferCopyZero(napi_env env, napi_callback_info info) {
  napi_value ab_null;
  NODE_API_CALL(env, emnapi_create_arraybuffer_copy(env, NULL, 0, &ab_null));

  uint8_t dummy = 42;
  napi_value ab_nonnull;
  NODE_API_CALL(env, emnapi_create_arraybuffer_copy(env, &dummy, 0, &ab_nonnull));

  void* address = (void*)1;
  bool runtime_allocated = true;
  NODE_API_CALL(env, emnapi_get_memory_address(env, ab_null, &address, NULL, &runtime_allocated));
  NODE_API_ASSERT(env, address == NULL && !runtime_allocated, "zero-length copy must not register a mirror");

  napi_value pair;
  NODE_API_CALL(env, napi_create_array_with_length(env, 2, &pair));
  NODE_API_CALL(env, napi_set_element(env, pair, 0, ab_null));
  NODE_API_CALL(env, napi_set_element(env, pair, 1, ab_nonnull));
  return pair;
}

static napi_value CreateArrayBufferCopyInvalidArgs(napi_env env, napi_callback_info info) {
  uint8_t src[4] = { 1, 2, 3, 4 };
  napi_value ab = NULL;

  napi_status status = emnapi_create_arraybuffer_copy(NULL, src, sizeof(src), &ab);
  NODE_API_ASSERT(env, status == napi_invalid_arg, "NULL env must return napi_invalid_arg");

  status = emnapi_create_arraybuffer_copy(env, src, sizeof(src), NULL);
  NODE_API_ASSERT(env, status == napi_invalid_arg, "NULL result must return napi_invalid_arg");

  status = emnapi_create_arraybuffer_copy(env, NULL, sizeof(src), &ab);
  NODE_API_ASSERT(env, status == napi_invalid_arg, "NULL data with non-zero length must return napi_invalid_arg");

  napi_value ok;
  NODE_API_CALL(env, napi_get_boolean(env, true, &ok));
  return ok;
}

static napi_value CreateArrayBufferCopyOutOfRange(napi_env env, napi_callback_info info) {
  uint8_t src[4] = { 1, 2, 3, 4 };
  size_t wasm_memory_size = __builtin_wasm_memory_size(0) << 16;
  napi_value ab = NULL;
#if __SIZEOF_SIZE_T__ == 8
  // On wasm64, a 4 GiB length must not wrap to 0 via uint32 truncation.
  napi_status status4g = emnapi_create_arraybuffer_copy(env, src, ((size_t)1 << 32), &ab);
  NODE_API_ASSERT(env, status4g == napi_pending_exception, "4 GiB length must set pending RangeError on wasm64");
  napi_value ignored_exc;
  NODE_API_CALL(env, napi_get_and_clear_last_exception(env, &ignored_exc));
#endif
  napi_status status = emnapi_create_arraybuffer_copy(env, src, wasm_memory_size + 1, &ab);
  NODE_API_ASSERT(env, status == napi_pending_exception, "out-of-range length must set pending RangeError");
  return NULL;
}

static napi_value CreateArrayBufferCopyAt(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc == 2, "Wrong number of arguments");
  double offset_d = 0;
  double length_d = 0;
  NODE_API_CALL(env, napi_get_value_double(env, args[0], &offset_d));
  NODE_API_CALL(env, napi_get_value_double(env, args[1], &length_d));
  napi_value ab = NULL;
  NODE_API_CALL(env, emnapi_create_arraybuffer_copy(
      env, (const void*)(uintptr_t)(uint64_t)offset_d, (size_t)(uint64_t)length_d, &ab));
  return ab;
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
    DECLARE_NODE_API_PROPERTY("TestUint64", TestUint64),
    DECLARE_NODE_API_PROPERTY("CreateArrayBufferCopy", CreateArrayBufferCopy),
    DECLARE_NODE_API_PROPERTY("CreateArrayBufferCopyZero", CreateArrayBufferCopyZero),
    DECLARE_NODE_API_PROPERTY("CreateArrayBufferCopyInvalidArgs", CreateArrayBufferCopyInvalidArgs),
    DECLARE_NODE_API_PROPERTY("CreateArrayBufferCopyOutOfRange", CreateArrayBufferCopyOutOfRange),
    DECLARE_NODE_API_PROPERTY("CreateArrayBufferCopyAt", CreateArrayBufferCopyAt),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
