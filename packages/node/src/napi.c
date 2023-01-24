#include <assert.h>
#include <stdlib.h>
#include <node_api.h>

#ifdef NDEBUG
#define	NAPI_ASSERT(the_call) (the_call)
#else
#define NAPI_ASSERT(the_call) (assert(napi_ok == (the_call)))
#endif

static napi_value napi_async_init_js(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  size_t argc = 2;
  napi_async_context ctx;
  napi_value ret;
  napi_status status;
  napi_value status_value, ret_value;
  napi_valuetype type;
  napi_value resource = NULL;
  NAPI_ASSERT(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  NAPI_ASSERT(napi_typeof(env, argv[0], &type));
  if (type != napi_undefined && type != napi_null) {
    resource = argv[0];
  }
  status = napi_async_init(env, resource, argv[1], &ctx);
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

static napi_value napi_make_callback_js(napi_env env, napi_callback_info info) {
  napi_value argv[4];
  size_t argc = 4;
  int64_t ctx = 0;
  napi_value ret;
  napi_status status;
  napi_value status_value, ret_value;
  bool lossless;
  napi_value arr;
  uint32_t len = 0;
  napi_value* callback_argv = NULL;
  napi_value err = NULL;

  NAPI_ASSERT(napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  NAPI_ASSERT(napi_get_value_bigint_int64(env, *argv, &ctx, &lossless));
  arr = argv[3];
  NAPI_ASSERT(napi_get_array_length(env, arr, &len));
  if (len != 0) {
    callback_argv = (napi_value*) malloc(len * sizeof(napi_value));
  } 
  for (uint32_t i = 0; i < len; ++i) {
    NAPI_ASSERT(napi_get_element(env, arr, i, callback_argv + i));
  }
  NAPI_ASSERT(napi_get_and_clear_last_exception(env, &err));
  err = NULL;
  status = napi_make_callback(env, (napi_async_context) ctx, argv[1], argv[2], len, callback_argv, &ret_value);
  if (callback_argv != NULL) {
    free(callback_argv);
  }
  if (status == napi_pending_exception) {
    NAPI_ASSERT(napi_get_and_clear_last_exception(env, &err));
  }
  NAPI_ASSERT(napi_create_object(env, &ret));
  NAPI_ASSERT(napi_create_int32(env, status, &status_value));
  NAPI_ASSERT(napi_set_named_property(env, ret, "status", status_value));
  if (err != NULL) {
    NAPI_ASSERT(napi_get_undefined(env, &ret_value));
    NAPI_ASSERT(napi_set_named_property(env, ret, "value", ret_value));
    NAPI_ASSERT(napi_set_named_property(env, ret, "error", err));
  } else {
    NAPI_ASSERT(napi_set_named_property(env, ret, "value", ret_value));
  }
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

  napi_value mc;
  NAPI_ASSERT(napi_create_function(env, "makeCallback", NAPI_AUTO_LENGTH, napi_make_callback_js, NULL, &mc));
  NAPI_ASSERT(napi_set_named_property(env, exports, "makeCallback", mc));

  /* napi_value ocs;
  napi_create_function(env, "napiOpenCallbackScope", NAPI_AUTO_LENGTH, napi_open_callback_scope_js, NULL, &ocs);
  napi_set_named_property(env, exports, "napiOpenCallbackScope", ocs); */

  return exports;
}
