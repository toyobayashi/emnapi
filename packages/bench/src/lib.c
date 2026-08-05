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

static napi_value convert_bigint_int64(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  int64_t input;
  bool lossless;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_bigint_int64(env, argv, &input, &lossless);
  napi_create_bigint_int64(env, input, &ret);
  return ret;
}

static napi_value convert_bigint_uint64(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  uint64_t input;
  bool lossless;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_bigint_uint64(env, argv, &input, &lossless);
  napi_create_bigint_uint64(env, input, &ret);
  return ret;
}

static napi_value get_bigint_words(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  int sign_bit;
  size_t word_count = 4;
  uint64_t words[4];
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_bigint_words(env, argv, &sign_bit, &word_count, words);
  napi_create_uint32(env, (uint32_t) word_count, &ret);
  return ret;
}

static napi_value create_bigint_words(napi_env env, napi_callback_info info) {
  napi_value ret;
  const uint64_t words[4] = { 123, 456, 789, 101112 };
  napi_create_bigint_words(env, 0, 4, words, &ret);
  return ret;
}

static napi_value get_latin1_oversized(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  char output[256];
  size_t copied;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_string_latin1(env, argv, output, sizeof(output), &copied);
  napi_create_uint32(env, (uint32_t) copied, &ret);
  return ret;
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

static napi_value sum_arraybuffer(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  void* input;
  size_t length;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_arraybuffer_info(env, argv, &input, &length);
  uint32_t sum = 0;
  for (size_t i = 0; i < length; i++) {
    sum += ((uint8_t*) input)[i];
  }
  napi_create_uint32(env, sum, &ret);
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
  EXPORT_FUNCTION(env, exports, "convertBigIntInt64", convert_bigint_int64);
  EXPORT_FUNCTION(env, exports, "convertBigIntUint64", convert_bigint_uint64);
  EXPORT_FUNCTION(env, exports, "getBigIntWords", get_bigint_words);
  EXPORT_FUNCTION(env, exports, "createBigIntWords", create_bigint_words);
  EXPORT_FUNCTION(env, exports, "getLatin1Oversized", get_latin1_oversized);
  EXPORT_FUNCTION(env, exports, "convertString", convert_string);
  EXPORT_FUNCTION(env, exports, "objectGet", object_get);
  EXPORT_FUNCTION(env, exports, "objectSet", object_set);
  EXPORT_FUNCTION(env, exports, "fib", js_fib);
  EXPORT_FUNCTION(env, exports, "handleChurn", handle_churn);
  EXPORT_FUNCTION(env, exports, "referenceChurn", reference_churn);
  EXPORT_FUNCTION(env, exports, "sumArrayBuffer", sum_arraybuffer);

  return exports;
}
