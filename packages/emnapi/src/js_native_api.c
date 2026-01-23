#include "emnapi_internal.h"

EXTERN_C_START

static const char* emnapi_error_messages[] = {
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
  "External buffers are not allowed",
  "Cannot run JavaScript",
};

napi_status napi_get_last_error_info(
    node_api_basic_env basic_env, const napi_extended_error_info** result) {
  napi_env env = (napi_env) basic_env;
  CHECK_ENV(env);
  CHECK_ARG(env, result);

  const int last_status = napi_cannot_run_js;

#if (defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L) || defined(__cplusplus)
  static_assert((sizeof(emnapi_error_messages) / sizeof(const char*)) == napi_cannot_run_js + 1,
                "Count of error messages must match count of error values");
#endif

  CHECK_LE(env->last_error.error_code, last_status);

  env->last_error.error_message = emnapi_error_messages[env->last_error.error_code];

  if (env->last_error.error_code == napi_ok) {
    napi_clear_last_error(env);
  }
  *result = &(env->last_error);
  return napi_ok;
}

EXTERN_C_END
