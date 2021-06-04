#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include "lib.h"

#include "node_api.h"

static napi_value _native_fn(napi_env env, napi_callback_info info) {
  napi_value number;
  void* data;
  napi_get_instance_data(env, &data);
  const napi_extended_error_info* errinfo;
  napi_get_last_error_info(env, &errinfo);
  printf("error_info.error_message: %s\n", errinfo->error_message);
  printf("error_info.error_code: %d\n", errinfo->error_code);
  napi_create_int32(env, *((int*)data), &number);
  return number;
}

NAPI_MODULE_INIT() {
  int* data = (int*)malloc(sizeof(int));
  *data = 996;
  napi_set_instance_data(env, data, NULL, NULL);
  printf("instance_data: %d\n", *data);
  napi_value fn;
  napi_create_function(env, "nativeFn", -1, _native_fn, NULL, &fn);
  return fn;
}
