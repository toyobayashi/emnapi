#include <assert.h>
#include <node_api.h>

#define NAPI_ASSERT(call) assert(napi_ok == (call))

static napi_value napi_async_init_js(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  size_t argc = 2;
  napi_async_context ctx;
  napi_value ret;
  napi_status status;
  napi_value status_value, ret_value;
  NAPI_ASSERT(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  status = napi_async_init(env, argv[0], argv[1], &ctx);
  NAPI_ASSERT(napi_create_object(env, &ret));
  NAPI_ASSERT(napi_create_int32(env, status, &status_value));
  NAPI_ASSERT(napi_create_bigint_int64(env, (int64_t) ctx, &ret_value));
  NAPI_ASSERT(napi_set_named_property(env, ret, "status", status_value));
  NAPI_ASSERT(napi_set_named_property(env, ret, "value", ret_value));
  return ret;
}

static napi_value napi_async_destroy_js(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  size_t argc = 1;
  int64_t ctx;
  napi_value ret;
  napi_status status;
  napi_value status_value, ret_value;
  bool lossless;
  NAPI_ASSERT(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  NAPI_ASSERT(napi_get_value_bigint_int64(env, *argv, &ctx, &lossless));
  status = napi_async_destroy(env, (napi_async_context) ctx);
  NAPI_ASSERT(napi_create_object(env, &ret));
  NAPI_ASSERT(napi_create_int32(env, status, &status_value));
  NAPI_ASSERT(napi_get_undefined(env, &ret_value));
  NAPI_ASSERT(napi_set_named_property(env, ret, "status", status_value));
  NAPI_ASSERT(napi_set_named_property(env, ret, "value", ret_value));
  return ret;
}

/* static napi_value napi_open_callback_scope_js(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  size_t argc = 2;
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  bool lossless;
  int64_t ctx;
  napi_get_value_bigint_int64(env, argv[1], &ctx, &lossless);
  napi_callback_scope scope;
  napi_open_callback_scope(env, argv[0], (napi_async_context) ctx, &scope);
  napi_value ret;
  napi_create_bigint_int64(env, (int64_t) scope, &ret);
  return ret;
} */

NAPI_MODULE_INIT() {
  napi_value ai;
  NAPI_ASSERT(napi_create_function(env, "asyncInit", NAPI_AUTO_LENGTH, napi_async_init_js, NULL, &ai));
  NAPI_ASSERT(napi_set_named_property(env, exports, "asyncInit", ai));

  napi_value ad;
  NAPI_ASSERT(napi_create_function(env, "asyncDestroy", NAPI_AUTO_LENGTH, napi_async_destroy_js, NULL, &ad));
  NAPI_ASSERT(napi_set_named_property(env, exports, "asyncDestroy", ad));

  /* napi_value ocs;
  napi_create_function(env, "napiOpenCallbackScope", NAPI_AUTO_LENGTH, napi_open_callback_scope_js, NULL, &ocs);
  napi_set_named_property(env, exports, "napiOpenCallbackScope", ocs); */

  return exports;
}
