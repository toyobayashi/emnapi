#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

#include "node_api.h"

static napi_value _i32(napi_env env, napi_callback_info info) {
  napi_value i32;
  void* instance_data;
  napi_get_instance_data(env, &instance_data);
  napi_create_int32(env, *((int*)instance_data), &i32);
  return i32;
}

NAPI_MODULE_INIT() {
  napi_value js_i32;
  int* instance_data;

  instance_data = (int*)malloc(sizeof(int));
  *instance_data = 233;
  napi_set_instance_data(env, instance_data, NULL, NULL);
  napi_create_function(env, NULL, 0, _i32, NULL, &js_i32);
  napi_set_named_property(env, exports, "i32", js_i32);

  return exports;
}
