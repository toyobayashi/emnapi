#include <js_native_api.h>
#include "../common.h"

static napi_value Test1(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc == 1,
      "Test1: Wrong number of arguments. Expects a single argument.");

  napi_valuetype valuetype0;
  NODE_API_CALL(env, napi_typeof(env, args[0], &valuetype0));
  NODE_API_ASSERT(env, valuetype0 == napi_function,
      "Test1: Wrong type of arguments. Expects a function as first argument.");

  napi_value argv[1];
  NODE_API_CALL(env, napi_create_bigint_int64(env, (int64_t) info, argv));

  napi_value global;
  NODE_API_CALL(env, napi_get_global(env, &global));

  napi_value cb = args[0];
  NODE_API_CALL(env, napi_call_function(env, global, cb, 1, argv, NULL));

  return NULL;
}

static napi_value Test2(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc == 1,
      "Test2: Wrong number of arguments. Expects a single argument.");

  napi_valuetype valuetype0;
  NODE_API_CALL(env, napi_typeof(env, args[0], &valuetype0));
  NODE_API_ASSERT(env, valuetype0 == napi_bigint,
      "Test2: Wrong type of arguments. Expects a bigint as first argument.");
  
  int64_t prev_info;
  bool lossless;
  NODE_API_CALL(env, napi_get_value_bigint_int64(env, args[0], &prev_info, &lossless));

  size_t prev_argc = 1;
  napi_value prev_args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, (napi_callback_info) prev_info, &prev_argc, prev_args, NULL, NULL));

  NODE_API_ASSERT(env, prev_argc == 1,
      "Test2: Wrong number of arguments. Expects a single argument.");

  napi_valuetype t;
  NODE_API_CALL(env, napi_typeof(env, prev_args[0], &t));
  NODE_API_ASSERT(env, t == napi_function,
      "Test2: Wrong type of arguments. Expects a function as first argument.");
  return NULL;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[2] = {
    DECLARE_NODE_API_PROPERTY("test1", Test1),
    DECLARE_NODE_API_PROPERTY("test2", Test2),
  };
  NODE_API_CALL(env, napi_define_properties(env, exports, 2, desc));
  return exports;
}
EXTERN_C_END
