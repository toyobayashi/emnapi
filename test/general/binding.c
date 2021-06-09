#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <js_native_api.h>

#include "../common.h"

static napi_value testNapiRun(napi_env env, napi_callback_info info) {
  napi_value script, result;
  size_t argc = 1;

  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, &script, NULL, NULL));

  NAPI_CALL(env, napi_run_script(env, script, &result));

  return result;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    // DECLARE_NAPI_PROPERTY("testStrictEquals", testStrictEquals),
    // DECLARE_NAPI_PROPERTY("testGetPrototype", testGetPrototype),
    // DECLARE_NAPI_PROPERTY("testGetVersion", testGetVersion),
    DECLARE_NAPI_PROPERTY("testNapiRun", testNapiRun)
    // DECLARE_NAPI_PROPERTY("doInstanceOf", doInstanceOf),
    // DECLARE_NAPI_PROPERTY("getUndefined", getUndefined),
    // DECLARE_NAPI_PROPERTY("getNull", getNull),
    // DECLARE_NAPI_PROPERTY("createNapiError", createNapiError),
    // DECLARE_NAPI_PROPERTY("testNapiErrorCleanup", testNapiErrorCleanup),
    // DECLARE_NAPI_PROPERTY("testNapiTypeof", testNapiTypeof),
    // DECLARE_NAPI_PROPERTY("wrap", wrap),
    // DECLARE_NAPI_PROPERTY("envCleanupWrap", env_cleanup_wrap),
    // DECLARE_NAPI_PROPERTY("unwrap", unwrap),
    // DECLARE_NAPI_PROPERTY("removeWrap", remove_wrap),
    // DECLARE_NAPI_PROPERTY("addFinalizerOnly", add_finalizer_only),
    // DECLARE_NAPI_PROPERTY("testFinalizeWrap", test_finalize_wrap),
    // DECLARE_NAPI_PROPERTY("finalizeWasCalled", finalize_was_called),
    // DECLARE_NAPI_PROPERTY("derefItemWasCalled", deref_item_was_called),
    // DECLARE_NAPI_PROPERTY("testAdjustExternalMemory", testAdjustExternalMemory)
  };

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(descriptors) / sizeof(*descriptors), descriptors));

  return exports;
}
EXTERN_C_END
