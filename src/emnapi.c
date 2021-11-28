#include "emnapi.h"
#include "node_api.h"

EXTERN_C_START

extern napi_status napi_set_last_error(napi_env env,
                                       napi_status error_code,
                                       uint32_t engine_error_code,
                                       void* engine_reserved);
extern napi_status napi_clear_last_error(napi_env env);

const char* emnapi_error_messages[] = {
  NULL,
  "Invalid argument",
  "An object was expected",
  "A string was expected",
  "A string or symbol was expected",
  "A function was expected",
  "A number was expected",
  "A boolean was expected",
  "An array was expected",
  "Unknown failure",
  "An exception is pending",
  "The async work item was cancelled",
  "napi_escape_handle already called on scope",
  "Invalid handle scope usage",
  "Invalid callback scope usage",
  "Thread-safe function queue is full",
  "Thread-safe function handle is closing",
  "A bigint was expected",
  "A date was expected",
  "An arraybuffer was expected",
  "A detachable arraybuffer was expected",
  "Main thread would deadlock",
};

napi_status
napi_get_node_version(napi_env env,
                      const napi_node_version** version) {
  if (env == NULL) return napi_invalid_arg;
  if (version == NULL) {
    return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
  }
  static napi_node_version node_version = {
    14,
    16,
    0,
    "node"
  };
  *version = &node_version;
  return napi_clear_last_error(env);
}

napi_status
emnapi_get_emscripten_version(napi_env env,
                              const emnapi_emscripten_version** version) {
  if (env == NULL) return napi_invalid_arg;
  if (version == NULL) {
    return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
  }
  static emnapi_emscripten_version emscripten_version = {
    __EMSCRIPTEN_major__,
    __EMSCRIPTEN_minor__,
    __EMSCRIPTEN_tiny__
  };
  *version = &emscripten_version;
  return napi_clear_last_error(env);
}

EXTERN_C_END
