#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include <stdio.h>
#else
int console_log(const char* fmt, void* a);
#endif
#include <node_api.h>
#include "../common.h"

#if defined _WIN32
#include <windows.h>
#else
#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include <unistd.h>
#else
void sleep(int s);
#endif
#endif

void* malloc(size_t size);
void free(void* p);

struct ctx {
  int in;
  int count;
  napi_async_work work;
  napi_ref ok_callback;
  napi_threadsafe_function progress_callback;
  int out;
  int status;
};

static void Execute(napi_env env, void* user_data) {
  struct ctx* data = (struct ctx*) user_data;
  for (int i = 0; i < data->count; ++i) {
#if defined _WIN32
    Sleep(1000);
#else
    sleep(1);
#endif
    int* index = (int*)malloc(sizeof(int));
    data->out++;
    *index = data->out;
    if (napi_ok != napi_call_threadsafe_function(data->progress_callback, index, napi_tsfn_blocking)) {
      data->status = 1;
      return;
    }
  }
}

static void Complete(napi_env env, napi_status status, void* user_data) {
  struct ctx* data = (struct ctx*) user_data;
  NODE_API_CALL_RETURN_VOID(env, napi_release_threadsafe_function(data->progress_callback, napi_tsfn_release));
}

static void tsfn_finalize(napi_env env, void* user_data, void* hint) {
  struct ctx* data = (struct ctx*) user_data;
  int out = data->out;
  napi_ref ok_callback = data->ok_callback;
  napi_async_work work = data->work;
  int s = data->status;
  free(data);
  napi_value callback, undefined;
  NODE_API_CALL_RETURN_VOID(env, napi_get_reference_value(env, ok_callback, &callback));

  napi_value argv[2];
  NODE_API_CALL_RETURN_VOID(env, napi_create_int32(env, s, argv));
  NODE_API_CALL_RETURN_VOID(env, napi_create_int32(env, out, argv + 1));
  NODE_API_CALL_RETURN_VOID(env, napi_get_undefined(env, &undefined));
  NODE_API_CALL_RETURN_VOID(env, napi_call_function(env, undefined, callback, 2, argv, NULL));
  NODE_API_CALL_RETURN_VOID(env, napi_delete_reference(env, ok_callback));
  NODE_API_CALL_RETURN_VOID(env, napi_delete_async_work(env, work));
}

static void call_js(napi_env env, napi_value cb, void* hint, void* data) {
  int index = *((int*) data);
  free(data);
  
  if (!(env == NULL || cb == NULL)) {
    napi_value argv, undefined;
    NODE_API_CALL_RETURN_VOID(env, napi_create_int32(env, index, &argv));
    NODE_API_CALL_RETURN_VOID(env, napi_get_undefined(env, &undefined));
    NODE_API_CALL_RETURN_VOID(env, napi_call_function(env, undefined, cb, 1, &argv,
        NULL));
  }
}

static napi_value Test(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value argv[4];
  napi_value resname1, resname2;
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));
  NODE_API_CALL(env, napi_create_string_utf8(env, "progress_callback", -1, &resname1));
  NODE_API_CALL(env, napi_create_string_utf8(env, "tsfntest", -1, &resname2));

  int32_t in, count;
  napi_ref ok_callback;
  
  NODE_API_CALL(env, napi_get_value_int32(env, argv[0], &in));
  NODE_API_CALL(env, napi_get_value_int32(env, argv[1], &count));
  NODE_API_CALL(env, napi_create_reference(env, argv[2], 1, &ok_callback));

  struct ctx* data = (struct ctx*)malloc(sizeof(struct ctx));
  if (!data) {
    NODE_API_CALL(env, napi_throw_error(env, NULL, "OOM"));
    return NULL;
  }
  data->in = in;
  data->count = count;
  data->ok_callback = ok_callback;
  data->out = in;
  data->status = 0;

  NODE_API_CALL(env, napi_create_async_work(env, NULL, resname2, Execute, Complete, data, &data->work));
  NODE_API_CALL(env, napi_create_threadsafe_function(env,
    argv[3], NULL, resname1, 0, 1,
    data, tsfn_finalize, NULL, call_js, &data->progress_callback));
  NODE_API_CALL(env, napi_queue_async_work(env, data->work));
  return NULL;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
    DECLARE_NODE_API_PROPERTY("testTSFN", Test),
  };

  NODE_API_CALL(env, napi_define_properties(env, exports,
    sizeof(properties)/sizeof(properties[0]), properties));

  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
