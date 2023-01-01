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
  char* buf = (char*) malloc(len);
  napi_get_value_string_utf8(env, argv, buf, len, &len);
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

#define EXPORT_FUNCTION(env, exports, name, f) \
  do { \
    napi_value f##_fn; \
    NAPI_CALL((env), napi_create_function((env), NULL, NAPI_AUTO_LENGTH, (f), NULL, &(f##_fn))); \
    NAPI_CALL((env), napi_set_named_property((env), (exports), (name), (f##_fn))); \
  } while (0)

NAPI_MODULE_INIT() {
  EXPORT_FUNCTION(env, exports, "emptyFunction", empty_function);
  EXPORT_FUNCTION(env, exports, "returnParam", return_param);
  EXPORT_FUNCTION(env, exports, "convertInteger", convert_integer);
  EXPORT_FUNCTION(env, exports, "convertString", convert_string);
  EXPORT_FUNCTION(env, exports, "objectGet", object_get);
  EXPORT_FUNCTION(env, exports, "objectSet", object_set);
  EXPORT_FUNCTION(env, exports, "fib", js_fib);

  return exports;
}
