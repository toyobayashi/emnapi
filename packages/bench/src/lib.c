#include <node_api.h>
#include "../../test/common.h"

static napi_value empty_function(napi_env env, napi_callback_info info) {
  return NULL;
}

NAPI_MODULE_INIT() {
  napi_value js_empty_function;
  NAPI_CALL(env, napi_create_function(env,
    NULL, NAPI_AUTO_LENGTH,
    empty_function, NULL, &js_empty_function));

  NAPI_CALL(env, napi_set_named_property(env,
    exports, "emptyFunction", js_empty_function));

  return exports;
}
