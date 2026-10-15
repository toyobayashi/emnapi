#include <node_api.h>
#include <stdlib.h>
#include "../common.h"

typedef struct {
  napi_threadsafe_function tsfn;
} Holder;

static void CallJs(napi_env env, napi_value js_cb, void* context, void* data) {
  NODE_API_BASIC_ASSERT_RETURN_VOID(false, "The queue stays empty");
}

// Runs during environment teardown after the TSFN drops its environment
// reference. Releasing the TSFN here reenters its finalization.
static void FinalizeHolder(napi_env env, void* data, void* hint) {
  Holder* holder = data;
  napi_status status =
      napi_release_threadsafe_function(holder->tsfn, napi_tsfn_abort);
  if (status != napi_ok) {
    abort();
  }
  free(holder);
}

NAPI_MODULE_INIT() {
  napi_value name;
  napi_value external;
  Holder* holder = malloc(sizeof(*holder));
  NODE_API_ASSERT(env, holder != NULL, "Holder allocation");

  NODE_API_CALL(
      env,
      napi_create_string_utf8(env, "tsfn_teardown", NAPI_AUTO_LENGTH, &name));

  // The initial thread count remains held when the environment tears down.
  NODE_API_CALL(env,
                napi_create_threadsafe_function(env,
                                                NULL,
                                                NULL,
                                                name,
                                                0,
                                                1,
                                                NULL,
                                                NULL,
                                                NULL,
                                                CallJs,
                                                &holder->tsfn));
  NODE_API_CALL(env, napi_unref_threadsafe_function(env, holder->tsfn));

  // The module export keeps the external alive until environment teardown.
  NODE_API_CALL(
      env, napi_create_external(env, holder, FinalizeHolder, NULL, &external));
  NODE_API_CALL(env, napi_set_named_property(env, exports, "holder", external));

  return exports;
}
