#include <node_api.h>
#include "../../test/common.h"

static napi_value empty_function(napi_env env, napi_callback_info info) {
  return NULL;
}

static napi_value return_param(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  return argv;
}

NAPI_MODULE_INIT() {
  napi_value js_empty_function;
  NAPI_CALL(env, napi_create_function(env,
    NULL, NAPI_AUTO_LENGTH,
    empty_function, NULL, &js_empty_function));

  NAPI_CALL(env, napi_set_named_property(env,
    exports, "emptyFunction", js_empty_function));

  napi_value js_return_param;
  NAPI_CALL(env, napi_create_function(env,
    NULL, NAPI_AUTO_LENGTH,
    return_param, NULL, &js_return_param));

  NAPI_CALL(env, napi_set_named_property(env,
    exports, "returnParam", js_return_param));

  return exports;
}
