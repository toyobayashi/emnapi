#include <js_native_api.h>
#include "../common.h"
#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include "stdlib.h"
#else
void* malloc(size_t size);
void free(void* p);
void abort() {
  __builtin_trap();
}
#endif

static void Finalize(napi_env env, void* data, void* hint) {
  napi_value global, set_timeout;
  napi_ref* ref = data;
#ifdef NAPI_EXPERIMENTAL
  napi_status expected_status = napi_cannot_run_js;
#else
  napi_status expected_status = napi_pending_exception;
#endif  // NAPI_EXPERIMENTAL

  if (napi_delete_reference(env, *ref) != napi_ok) abort();
  if (napi_get_global(env, &global) != napi_ok) abort();
  if (napi_get_named_property(env, global, "setTimeout", &set_timeout) !=
      expected_status)
    abort();
  free(ref);
}

static napi_value CreateRef(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value cb;
  napi_valuetype value_type;
  napi_ref* ref = malloc(sizeof(*ref));
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, &cb, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Function takes only one argument");
  NAPI_CALL(env, napi_typeof(env, cb, &value_type));
  NAPI_ASSERT(
      env, value_type == napi_function, "argument must be function");
  NAPI_CALL(env, napi_add_finalizer(env, cb, ref, Finalize, NULL, ref));
  return cb;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
      DECLARE_NAPI_PROPERTY("createRef", CreateRef),
  };

  NAPI_CALL(
      env,
      napi_define_properties(
          env, exports, sizeof(properties) / sizeof(*properties), properties));

  return exports;
}
EXTERN_C_END
