#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

#include "node_api.h"

static napi_value _get_last_error(napi_env env, napi_callback_info info) {
  const napi_extended_error_info* errinfo;
  napi_value js_code;
  napi_value js_msg;
  napi_value ret;
  int code;
  const char* msg;

  napi_create_string_utf8(env, NULL, 0, NULL);
  napi_get_last_error_info(env, &errinfo);
  code = errinfo->error_code;
  msg = errinfo->error_message;
  napi_create_int32(env, code, &js_code);
  napi_create_string_utf8(env, msg, -1, &js_msg);

  napi_create_object(env, &ret);
  napi_set_named_property(env, ret, "code", js_code);
  napi_set_named_property(env, ret, "msg", js_msg);
  return ret;
}

static napi_value _throw_undef(napi_env env, napi_callback_info info) {
  napi_value err;
  napi_get_undefined(env, &err);
  napi_throw(env, err);
  return NULL;
}

static napi_value _throw_error(napi_env env, napi_callback_info info) {
  napi_throw_error(env, "CODE 1", "msg 1");
  return NULL;
}

static napi_value _throw_type_error(napi_env env, napi_callback_info info) {
  napi_throw_type_error(env, "CODE 2", "msg 2");
  return NULL;
}

static napi_value _throw_range_error(napi_env env, napi_callback_info info) {
  napi_throw_range_error(env, "CODE 3", "msg 3");
  return NULL;
}

static napi_value _create_error(napi_env env, napi_callback_info info) {
  napi_value code, msg, err;
  napi_create_string_utf8(env, "CODE 4", -1, &code);
  napi_create_string_utf8(env, "msg 4", -1, &msg);
  napi_create_error(env, code, msg, &err);
  return err;
}

static napi_value _is_error(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_value this_arg;
  bool ret = 0;
  napi_value js_ret;

  napi_get_cb_info(env, info, &argc, argv, &this_arg, NULL);
  napi_is_error(env, argv[0], &ret);
  napi_get_boolean(env, ret, &js_ret);
  return js_ret;
}

NAPI_MODULE_INIT() {
  napi_value js_get_last_error;
  napi_create_function(env, NULL, 0, _get_last_error, NULL, &js_get_last_error);
  napi_set_named_property(env, exports, "getLastError", js_get_last_error);

  napi_value js_throw_undef;
  napi_create_function(env, NULL, 0, _throw_undef, NULL, &js_throw_undef);
  napi_set_named_property(env, exports, "throwUndef", js_throw_undef);

  napi_value js_throw_error;
  napi_create_function(env, NULL, 0, _throw_error, NULL, &js_throw_error);
  napi_set_named_property(env, exports, "throwError", js_throw_error);

  napi_value js_throw_type_error;
  napi_create_function(env, NULL, 0, _throw_type_error, NULL, &js_throw_type_error);
  napi_set_named_property(env, exports, "throwTypeError", js_throw_type_error);

  napi_value js_throw_range_error;
  napi_create_function(env, NULL, 0, _throw_range_error, NULL, &js_throw_range_error);
  napi_set_named_property(env, exports, "throwRangeError", js_throw_range_error);

  napi_value js_create_error;
  napi_create_function(env, NULL, 0, _create_error, NULL, &js_create_error);
  napi_set_named_property(env, exports, "createError", js_create_error);

  napi_value js_is_error;
  napi_create_function(env, NULL, 0, _is_error, NULL, &js_is_error);
  napi_set_named_property(env, exports, "isError", js_is_error);
  return exports;
}
