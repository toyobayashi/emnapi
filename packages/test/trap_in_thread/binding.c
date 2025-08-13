#include <pthread.h>
#include <node_api.h>
#include <stdlib.h>
#include "../common.h"

void Callback(napi_env env, napi_value js_callback, void* context, void* data) {

}

void* ThreadRelease(void* data) {
  napi_threadsafe_function ts_fn = (napi_threadsafe_function)data;
  napi_release_threadsafe_function(ts_fn, napi_tsfn_release);
  return NULL;
}

void* ThreadAbort(void* data) {
  abort();
  return NULL;
}

static napi_value Abort(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_value async_name;
  napi_threadsafe_function ts_fn;
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, &argv, NULL, NULL));
  NODE_API_CALL(env, napi_create_string_utf8(env,
      "N-API Thread-safe Function Test", NAPI_AUTO_LENGTH, &async_name));
  NODE_API_CALL(env, napi_create_threadsafe_function(env,
                                                     argv,
                                                     NULL,
                                                     async_name,
                                                     0,
                                                     1,
                                                     NULL,
                                                     NULL,
                                                     NULL,
                                                     Callback,
                                                     &ts_fn));
  abort();
  return NULL;
}

static napi_value ReleaseInThread(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_value async_name;
  napi_threadsafe_function ts_fn;
  pthread_t uv_threads;
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, &argv, NULL, NULL));
  NODE_API_CALL(env, napi_create_string_utf8(env,
      "N-API Thread-safe Function Test", NAPI_AUTO_LENGTH, &async_name));
  NODE_API_CALL(env, napi_create_threadsafe_function(env,
                                                     argv,
                                                     NULL,
                                                     async_name,
                                                     0,
                                                     1,
                                                     NULL,
                                                     NULL,
                                                     NULL,
                                                     Callback,
                                                     &ts_fn));
  pthread_create(&uv_threads, NULL, ThreadRelease, ts_fn);
  pthread_detach(uv_threads);
  return NULL;
}

static napi_value AbortInThread(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_value async_name;
  napi_threadsafe_function ts_fn;
  pthread_t uv_threads;
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, &argv, NULL, NULL));
  NODE_API_CALL(env, napi_create_string_utf8(env,
      "N-API Thread-safe Function Test", NAPI_AUTO_LENGTH, &async_name));
  NODE_API_CALL(env, napi_create_threadsafe_function(env,
                                                     argv,
                                                     NULL,
                                                     async_name,
                                                     0,
                                                     1,
                                                     NULL,
                                                     NULL,
                                                     NULL,
                                                     Callback,
                                                     &ts_fn));
  pthread_create(&uv_threads, NULL, ThreadAbort, ts_fn);
  pthread_detach(uv_threads);
  return NULL;
}

static napi_value Join(napi_env env, napi_callback_info info) {
  pthread_t uv_threads;
  pthread_create(&uv_threads, NULL, ThreadAbort, NULL);
  pthread_join(uv_threads, NULL);
  return NULL;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    DECLARE_NODE_API_PROPERTY("abort", Abort),
    DECLARE_NODE_API_PROPERTY("releaseInThread", ReleaseInThread),
    DECLARE_NODE_API_PROPERTY("abortInThread", AbortInThread),
    DECLARE_NODE_API_PROPERTY("join", Join),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
