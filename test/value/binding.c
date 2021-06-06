#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

#include "node_api.h"

static napi_value _i32(napi_env env, napi_callback_info info) {
  napi_value i32;
  napi_create_int32(env, 996, &i32);
  return i32;
}

static napi_value _utf8(napi_env env, napi_callback_info info) {
  napi_value utf8;
  napi_create_string_utf8(env, "utf8", -1, &utf8);
  return utf8;
}

static napi_value _undef(napi_env env, napi_callback_info info) {
  napi_value undef;
  napi_get_undefined(env, &undef);
  return undef;
}

static napi_value _nil(napi_env env, napi_callback_info info) {
  napi_value nil;
  napi_get_null(env, &nil);
  return nil;
}

static napi_value _boolean(napi_env env, napi_callback_info info) {
  napi_value boolean;
  size_t argc = 1;
  napi_value argv[1];
  bool b;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_get_value_bool(env, argv[0], &b);
  napi_get_boolean(env, b, &boolean);
  return boolean;
}

static napi_value _global(napi_env env, napi_callback_info info) {
  napi_value global;
  napi_get_global(env, &global);
  return global;
}

NAPI_MODULE_INIT() {
  napi_value js_i32;
  napi_create_function(env, NULL, 0, _i32, NULL, &js_i32);
  napi_set_named_property(env, exports, "i32", js_i32);

  napi_value js_utf8;
  napi_create_function(env, NULL, 0, _utf8, NULL, &js_utf8);
  napi_set_named_property(env, exports, "utf8", js_utf8);

  napi_value js_undef;
  napi_create_function(env, NULL, 0, _undef, NULL, &js_undef);
  napi_set_named_property(env, exports, "undef", js_undef);

  napi_value js_nil;
  napi_create_function(env, NULL, 0, _nil, NULL, &js_nil);
  napi_set_named_property(env, exports, "nil", js_nil);

  napi_value js_boolean;
  napi_create_function(env, NULL, 0, _boolean, NULL, &js_boolean);
  napi_set_named_property(env, exports, "bool", js_boolean);

  napi_value js_global;
  napi_create_function(env, NULL, 0, _global, NULL, &js_global);
  napi_set_named_property(env, exports, "global", js_global);
  return exports;
}
