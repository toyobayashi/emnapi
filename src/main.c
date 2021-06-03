#include <stdio.h>
#include "lib.h"

#include "node_api.h"

static napi_value _native_fn(napi_env env, napi_callback_info info) {
  napi_value number;
  napi_create_int32(env, add(233, 666), &number);
  return number;
}

static napi_value _init(napi_env env, napi_value exports) {
  printf("init\n");
  napi_value fn;
  napi_create_function(env, NULL, 0, _native_fn, NULL, &fn);
  return fn;
}

NAPI_MODULE(emnapitest, _init)
