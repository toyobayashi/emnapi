#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

#include "node_api.h"

static napi_value _test_last_error(napi_env env, napi_callback_info info) {
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

NAPI_MODULE_INIT() {
  napi_value js_test_last_error;
  napi_create_function(env, NULL, 0, _test_last_error, NULL, &js_test_last_error);
  return js_test_last_error;
}
