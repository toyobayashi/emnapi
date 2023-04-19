#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#else
int console_log(const char* fmt, int a);
void* malloc(size_t size);
void free(void* p);
#define assert(x) do { if (!(x)) { __builtin_trap(); } } while (0)
#endif
#include "node_api.h"
#include "../common.h"

static int cleanup_hook_count = 0;
static void cleanup(void* arg) {
  cleanup_hook_count++;
#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
  printf("cleanup(%d)\n", *(int*)(arg));
#else
  console_log("cleanup(%d)\n", *(int*)(arg));
#endif
}

static int secret = 42;
static int wrong_secret = 17;

static void ObjectFinalizer(napi_env env, void* data, void* hint) {
  // cleanup is called once.
  assert(cleanup_hook_count == 1);

  napi_ref* ref = data;
  NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, *ref));
  free(ref);
}

static void CreateObjectWrap(napi_env env) {
  napi_value js_obj;
  napi_ref* ref = malloc(sizeof(*ref));
  NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &js_obj));
  NAPI_CALL_RETURN_VOID(
      env, napi_wrap(env, js_obj, ref, ObjectFinalizer, NULL, ref));
  // create a strong reference so that the finalizer is called at shutdown.
  NAPI_CALL_RETURN_VOID(env, napi_reference_ref(env, *ref, NULL));
}

static napi_value Init(napi_env env, napi_value exports) {
  // Create object wrap before cleanup hooks.
  CreateObjectWrap(env);

  napi_add_env_cleanup_hook(env, cleanup, &wrong_secret);
  napi_add_env_cleanup_hook(env, cleanup, &secret);
  napi_remove_env_cleanup_hook(env, cleanup, &wrong_secret);

  // Create object wrap after cleanup hooks.
  CreateObjectWrap(env);

  return NULL;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
