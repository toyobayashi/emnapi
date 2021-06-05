#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

#include "node_api.h"

static napi_value _anonymous(napi_env env, napi_callback_info info) {
  napi_value nil;
  napi_get_null(env, &nil);
  return nil;
}

static napi_value _fn(napi_env env, napi_callback_info info) {
  napi_value nil;
  napi_get_null(env, &nil);
  return nil;
}

NAPI_MODULE_INIT() {
  napi_value js_anonymous;
  napi_create_function(env, NULL, 0, _anonymous, NULL, &js_anonymous);
  napi_set_named_property(env, exports, "anonymous", js_anonymous);

  napi_value js_fn;
  napi_create_function(env, "fnName", -1, _fn, NULL, &js_fn);
  napi_set_named_property(env, exports, "fn", js_fn);

  return exports;
}
