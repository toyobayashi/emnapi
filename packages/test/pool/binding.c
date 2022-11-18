#include <uv.h>
#include <node_api.h>
#include <stdio.h>
#include "../common.h"

typedef struct {
  napi_deferred _deferred;
  napi_async_work _request;
} carrier;

static void F(void* data) {
  uv_sleep(1000);
}

static void some_method() {
  uv_thread_t pid[3];
  printf("some_method()\n");
  for (int i = 0; i < 3; ++i) {
    uv_thread_create(pid + i, F, NULL);
  }
  for (int i = 0; i < 3; ++i) {
    uv_thread_join(pid + i);
  }
}

static void Execute(napi_env env, void* data) {
  some_method();
}

static void Complete(napi_env env, napi_status status, void* data) {
  carrier* c = (carrier*)(data);

  if (status != napi_ok) {
    napi_throw_type_error(env, NULL, "Execute callback failed.");
    return;
  }

  napi_value argv;

  NAPI_CALL_RETURN_VOID(env, napi_get_undefined(env, &argv));
  NAPI_CALL_RETURN_VOID(env, napi_resolve_deferred(env, c->_deferred, argv));
  NAPI_CALL_RETURN_VOID(env, napi_delete_async_work(env, c->_request));
  free(c);
  printf("Complete\n");
}

static napi_value async_method(napi_env env, napi_callback_info info) {
  napi_value promise;
  napi_value name;
  NAPI_CALL(env,
      napi_create_string_utf8(env, "async_method", NAPI_AUTO_LENGTH, &name));
  carrier* the_carrier = (carrier*) malloc(sizeof(carrier));
  NAPI_CALL(env, napi_create_promise(env, &the_carrier->_deferred, &promise));
  NAPI_CALL(env, napi_create_async_work(env, NULL, name,
    Execute, Complete, the_carrier, &the_carrier->_request));
  NAPI_CALL(env, napi_queue_async_work(env, the_carrier->_request));

  return promise;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
    DECLARE_NAPI_PROPERTY("async_method", async_method),
  };

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(properties) / sizeof(*properties), properties));

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
