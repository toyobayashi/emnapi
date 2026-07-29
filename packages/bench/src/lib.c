#include <stdlib.h>
#include <node_api.h>
#include "../../test/common.h"
#include "fib.h"

static napi_value empty_function(napi_env env, napi_callback_info info) {
  return NULL;
}

static napi_value return_param(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  return argv;
}

static napi_value convert_integer(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  int32_t input = 0;
  napi_get_value_int32(env, argv, &input);
  napi_create_int32(env, input, &ret);
  return argv;
}

static napi_value convert_string(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  size_t len = 0;
  napi_get_value_string_utf8(env, argv, NULL, 0, &len);
  char* buf = (char*) malloc(len + 1);
  napi_get_value_string_utf8(env, argv, buf, len + 1, &len);
  napi_create_string_utf8(env, buf, len, &ret);
  free(buf);
  return ret;
}

static napi_value object_get(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_named_property(env, argv, "length", &ret);
  return ret;
}

static napi_value object_set(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3], ret;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_set_property(env, argv[0], argv[1], argv[2]);
  return NULL;
}

static napi_value js_fib(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  int32_t input = 0;
  napi_get_value_int32(env, argv, &input);
  int32_t result = fib(input);
  napi_create_int32(env, result, &ret);
  return ret;
}

static napi_value handle_churn(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  uint32_t count = 0;
  napi_value ret = NULL;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_uint32(env, argv, &count);
  for (uint32_t i = 0; i < count; i++) {
    napi_create_uint32(env, i, &ret);
  }
  return ret;
}

static napi_value reference_churn(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  uint32_t count = 0;
  napi_value ret;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_get_value_uint32(env, argv[1], &count);

  napi_ref* refs = (napi_ref*) malloc(sizeof(napi_ref) * count);
  if (refs == NULL && count != 0) {
    napi_throw_error(env, NULL, "Could not allocate reference array");
    return NULL;
  }
  for (uint32_t i = 0; i < count; i++) {
    napi_create_reference(env, argv[0], 1, &refs[i]);
  }
  for (uint32_t i = 0; i < count; i++) {
    napi_delete_reference(env, refs[i]);
  }
  free(refs);

  napi_create_uint32(env, count, &ret);
  return ret;
}

#define EXPORT_FUNCTION(env, exports, name, f) \
  do { \
    napi_value f##_fn; \
    NODE_API_CALL((env), napi_create_function((env), NULL, NAPI_AUTO_LENGTH, (f), NULL, &(f##_fn))); \
    NODE_API_CALL((env), napi_set_named_property((env), (exports), (name), (f##_fn))); \
  } while (0)

NAPI_MODULE_INIT() {
  EXPORT_FUNCTION(env, exports, "emptyFunction", empty_function);
  EXPORT_FUNCTION(env, exports, "returnParam", return_param);
  EXPORT_FUNCTION(env, exports, "convertInteger", convert_integer);
  EXPORT_FUNCTION(env, exports, "convertString", convert_string);
  EXPORT_FUNCTION(env, exports, "objectGet", object_get);
  EXPORT_FUNCTION(env, exports, "objectSet", object_set);
  EXPORT_FUNCTION(env, exports, "fib", js_fib);
  EXPORT_FUNCTION(env, exports, "handleChurn", handle_churn);
  EXPORT_FUNCTION(env, exports, "referenceChurn", reference_churn);

  return exports;
}
