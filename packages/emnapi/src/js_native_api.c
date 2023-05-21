#include "emnapi_internal.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/heap.h>
#endif

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

EMNAPI_INTERNAL_EXTERN void _emnapi_get_last_error_info(napi_env env,
                                        napi_status* error_code,
                                        uint32_t* engine_error_code,
                                        void** engine_reserved);

napi_status napi_get_last_error_info(
    napi_env env, const napi_extended_error_info** result) {
  static napi_extended_error_info last_error;
  CHECK_ENV(env);
  CHECK_ARG(env, result);

  const int last_status = napi_cannot_run_js;

  static_assert((sizeof(emnapi_error_messages) / sizeof(const char*)) == napi_cannot_run_js + 1,
                "Count of error messages must match count of error values");

  _emnapi_get_last_error_info(env,
                              &last_error.error_code,
                              &last_error.engine_error_code,
                              &last_error.engine_reserved);

  CHECK_LE(last_error.error_code, last_status);

  last_error.error_message = emnapi_error_messages[last_error.error_code];

  if (last_error.error_code == napi_ok) {
    napi_clear_last_error(env);
    last_error.engine_error_code = 0;
    last_error.engine_reserved = NULL;
  }
  *result = &last_error;
  return napi_ok;
}

#define PAGESIZE 65536

napi_status napi_adjust_external_memory(napi_env env,
                                        int64_t change_in_bytes,
                                        int64_t* adjusted_value) {
  CHECK_ENV(env);
  CHECK_ARG(env, adjusted_value);

  if (change_in_bytes < 0) {
    return napi_set_last_error(env, napi_invalid_arg, 0, NULL);
  }

  size_t old_size = __builtin_wasm_memory_size(0) << 16;
  size_t new_size = old_size + (size_t) change_in_bytes;
#ifdef __EMSCRIPTEN__
  if (!emscripten_resize_heap(new_size)) {
    return napi_set_last_error(env, napi_generic_failure, 0, NULL);
  }
#else
  new_size = new_size + (PAGESIZE - new_size % PAGESIZE) % PAGESIZE;
  if (-1 == __builtin_wasm_memory_grow(0, (new_size - old_size + 65535) >> 16)) {
    return napi_set_last_error(env, napi_generic_failure, 0, NULL);
  }
#endif

  *adjusted_value = (int64_t) (__builtin_wasm_memory_size(0) << 16);

  return napi_clear_last_error(env);
}

napi_status napi_get_version(napi_env env, uint32_t* result) {
  CHECK_ENV(env);
  CHECK_ARG(env, result);
  *result = NAPI_VERSION;
  return napi_clear_last_error(env);
}

EXTERN_C_END
