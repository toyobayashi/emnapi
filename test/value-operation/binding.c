#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

// #define NAPI_VERSION 6
#include <node_api.h>

// #include "../common.h"

static napi_value _coerce_to_bool(napi_env env, napi_callback_info info) {
  napi_value ret;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_coerce_to_bool(env, argv[0], &ret);
  return ret;
}

static napi_value _coerce_to_number(napi_env env, napi_callback_info info) {
  napi_value ret;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_coerce_to_number(env, argv[0], &ret);
  return ret;
}

static napi_value _coerce_to_object(napi_env env, napi_callback_info info) {
  napi_value ret;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_coerce_to_object(env, argv[0], &ret);
  return ret;
}

static napi_value _coerce_to_string(napi_env env, napi_callback_info info) {
  napi_value ret;
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_coerce_to_string(env, argv[0], &ret);
  return ret;
}

NAPI_MODULE_INIT() {
  napi_value js_coerce_to_bool;
  napi_create_function(env, NULL, 0, _coerce_to_bool, NULL, &js_coerce_to_bool);
  napi_set_named_property(env, exports, "toBool", js_coerce_to_bool);

  napi_value js_coerce_to_number;
  napi_create_function(env, NULL, 0, _coerce_to_number, NULL, &js_coerce_to_number);
  napi_set_named_property(env, exports, "toNumber", js_coerce_to_number);

  napi_value js_coerce_to_object;
  napi_create_function(env, NULL, 0, _coerce_to_object, NULL, &js_coerce_to_object);
  napi_set_named_property(env, exports, "toObject", js_coerce_to_object);

  napi_value js_coerce_to_string;
  napi_create_function(env, NULL, 0, _coerce_to_string, NULL, &js_coerce_to_string);
  napi_set_named_property(env, exports, "toString", js_coerce_to_string);
  return exports;
}