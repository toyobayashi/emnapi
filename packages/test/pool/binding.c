#include <pthread.h>
#include <unistd.h>
#include <node_api.h>
#include "../common.h"

typedef struct {
  napi_deferred _deferred;
  napi_async_work _request;
} carrier;

static void* F(void* data) {
  sleep(1);
  return NULL;
}

static void some_method() {
  pthread_t pid[3];
  for (int i = 0; i < 3; ++i) {
    pthread_create(pid + i, NULL, F, NULL);
  }
  for (int i = 0; i < 3; ++i) {
    pthread_join(*(pid + i), NULL);
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
}

static napi_value async_method(napi_env env, napi_callback_info info) {
  napi_value promise;
  carrier* the_carrier = (carrier*) malloc(sizeof(carrier));
  NAPI_CALL(env, napi_create_promise(env, &the_carrier->_deferred, &promise));
  NAPI_CALL(env, napi_create_async_work(env, NULL, NULL,
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
