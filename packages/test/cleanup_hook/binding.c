#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include <stdio.h>
#else
int console_log(const char* fmt, int a);
#endif
#include "node_api.h"
#include "../common.h"

static void cleanup(void* arg) {
#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
  printf("cleanup(%d)\n", *(int*)(arg));
#else
  console_log("cleanup(%d)\n", *(int*)(arg));
#endif
}

static int secret = 42;
static int wrong_secret = 17;

static napi_value Init(napi_env env, napi_value exports) {
  napi_add_env_cleanup_hook(env, cleanup, &wrong_secret);
  napi_add_env_cleanup_hook(env, cleanup, &secret);
  napi_remove_env_cleanup_hook(env, cleanup, &wrong_secret);

  return NULL;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
