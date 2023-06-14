#include <node_api.h>
#include "../common.h"
#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include "stdlib.h"
#else
void* malloc(size_t size);
void free(void* p);
#endif

static uint32_t finalizeCount = 0;

static void FreeData(napi_env env, void* data, void* hint) {
  NAPI_ASSERT_RETURN_VOID(env, data != NULL, "Expects non-NULL data.");
  free(data);
}

static void Finalize(napi_env env, void* data, void* hint) {
  ++finalizeCount;
}

static napi_status GetArgValue(napi_env env,
                               napi_callback_info info,
                               napi_value* argValue) {
  size_t argc = 1;
  NAPI_CHECK_STATUS(
      napi_get_cb_info(env, info, &argc, argValue, NULL, NULL));

  NAPI_ASSERT_STATUS(env, argc == 1, "Expects one arg.");
  return napi_ok;
}

static napi_status GetArgValueAsIndex(napi_env env,
                                      napi_callback_info info,
                                      uint32_t* index) {
  napi_value argValue;
  NAPI_CHECK_STATUS(GetArgValue(env, info, &argValue));

  napi_valuetype valueType;
  NAPI_CHECK_STATUS(napi_typeof(env, argValue, &valueType));
  NAPI_ASSERT_STATUS(
      env, valueType == napi_number, "Argument must be a number.");

  return napi_get_value_uint32(env, argValue, index);
}

static napi_status GetRef(napi_env env,
                          napi_callback_info info,
                          napi_ref* ref) {
  uint32_t index;
  NAPI_CHECK_STATUS(GetArgValueAsIndex(env, info, &index));

  napi_ref* refValues;
  NAPI_CHECK_STATUS(napi_get_instance_data(env, (void**)&refValues));
  NAPI_ASSERT_STATUS(env, refValues != NULL, "Cannot get instance data.");

  *ref = refValues[index];
  return napi_ok;
}

static napi_value ToUInt32Value(napi_env env, uint32_t value) {
  napi_value result;
  NAPI_CALL(env, napi_create_uint32(env, value, &result));
  return result;
}

static napi_status InitRefArray(napi_env env) {
  // valueRefs array has one entry per napi_valuetype
  napi_ref* valueRefs = malloc(sizeof(napi_ref) * ((int)napi_bigint + 1));
  return napi_set_instance_data(env, valueRefs, &FreeData, NULL);
}

static napi_value CreateExternal(napi_env env, napi_callback_info info) {
  napi_value result;
  int* data = (int*)malloc(sizeof(int));
  *data = 42;
  NAPI_CALL(env, napi_create_external(env, data, &FreeData, NULL, &result));
  return result;
}

static napi_value CreateRef(napi_env env, napi_callback_info info) {
  napi_value argValue;
  NAPI_CALL(env, GetArgValue(env, info, &argValue));

  napi_valuetype valueType;
  NAPI_CALL(env, napi_typeof(env, argValue, &valueType));
  uint32_t index = (uint32_t)valueType;

  napi_ref* valueRefs;
  NAPI_CALL(env, napi_get_instance_data(env, (void**)&valueRefs));
  NAPI_CALL(env,
                napi_create_reference(env, argValue, 1, valueRefs + index));

  return ToUInt32Value(env, index);
}

static napi_value GetRefValue(napi_env env, napi_callback_info info) {
  napi_ref refValue;
  NAPI_CALL(env, GetRef(env, info, &refValue));
  napi_value value;
  NAPI_CALL(env, napi_get_reference_value(env, refValue, &value));
  return value;
}

static napi_value Ref(napi_env env, napi_callback_info info) {
  napi_ref refValue;
  NAPI_CALL(env, GetRef(env, info, &refValue));
  uint32_t refCount;
  NAPI_CALL(env, napi_reference_ref(env, refValue, &refCount));
  return ToUInt32Value(env, refCount);
}

static napi_value Unref(napi_env env, napi_callback_info info) {
  napi_ref refValue;
  NAPI_CALL(env, GetRef(env, info, &refValue));
  uint32_t refCount;
  NAPI_CALL(env, napi_reference_unref(env, refValue, &refCount));
  return ToUInt32Value(env, refCount);
}

static napi_value DeleteRef(napi_env env, napi_callback_info info) {
  napi_ref refValue;
  NAPI_CALL(env, GetRef(env, info, &refValue));
  NAPI_CALL(env, napi_delete_reference(env, refValue));
  return NULL;
}

static napi_value AddFinalizer(napi_env env, napi_callback_info info) {
  napi_value obj;
  NAPI_CALL(env, GetArgValue(env, info, &obj));

  napi_valuetype valueType;
  NAPI_CALL(env, napi_typeof(env, obj, &valueType));
  NAPI_ASSERT(env, valueType == napi_object, "Argument must be an object.");

  NAPI_CALL(env, napi_add_finalizer(env, obj, NULL, &Finalize, NULL, NULL));
  return NULL;
}

static napi_value GetFinalizeCount(napi_env env, napi_callback_info info) {
  return ToUInt32Value(env, finalizeCount);
}

static napi_value InitFinalizeCount(napi_env env, napi_callback_info info) {
  finalizeCount = 0;
  return NULL;
}

EXTERN_C_START

NAPI_MODULE_INIT() {
  finalizeCount = 0;
  NAPI_CALL(env, InitRefArray(env));

  napi_property_descriptor properties[] = {
      DECLARE_NAPI_PROPERTY("createExternal", CreateExternal),
      DECLARE_NAPI_PROPERTY("createRef", CreateRef),
      DECLARE_NAPI_PROPERTY("getRefValue", GetRefValue),
      DECLARE_NAPI_PROPERTY("ref", Ref),
      DECLARE_NAPI_PROPERTY("unref", Unref),
      DECLARE_NAPI_PROPERTY("deleteRef", DeleteRef),
      DECLARE_NAPI_PROPERTY("addFinalizer", AddFinalizer),
      DECLARE_NAPI_PROPERTY("getFinalizeCount", GetFinalizeCount),
      DECLARE_NAPI_PROPERTY("initFinalizeCount", InitFinalizeCount),
  };

  NAPI_CALL(
      env,
      napi_define_properties(
          env, exports, sizeof(properties) / sizeof(*properties), properties));

  return exports;
}

EXTERN_C_END
