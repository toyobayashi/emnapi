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

  napi_value js_fib_fn;
  NAPI_CALL(env, napi_create_function(env,
    NULL, NAPI_AUTO_LENGTH,
    js_fib, NULL, &js_fib_fn));

  NAPI_CALL(env, napi_set_named_property(env,
    exports, "fib", js_fib_fn));

  return exports;
}
