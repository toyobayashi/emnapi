#include "emnapi_common.h"

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
#include "uv.h"
#endif

#ifdef __EMSCRIPTEN__
#include <emscripten/heap.h>
#endif

#include "node_api.h"

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
  "External buffers are not allowed"
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

  const int last_status = napi_no_external_buffers_allowed;

  static_assert((sizeof(emnapi_error_messages) / sizeof(const char*)) == napi_no_external_buffers_allowed + 1,
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

EMNAPI_INTERNAL_EXTERN void _emnapi_get_node_version(uint32_t* major,
                                     uint32_t* minor,
                                     uint32_t* patch);

napi_status
napi_get_node_version(napi_env env,
                      const napi_node_version** version) {
  CHECK_ENV(env);
  CHECK_ARG(env, version);
  static napi_node_version node_version = {
    0,
    0,
    0,
    "node"
  };
  _emnapi_get_node_version(&node_version.major,
                           &node_version.minor,
                           &node_version.patch);
  *version = &node_version;
  return napi_clear_last_error(env);
}

#ifdef __EMSCRIPTEN__
napi_status
emnapi_get_emscripten_version(napi_env env,
                              const emnapi_emscripten_version** version) {
  CHECK_ENV(env);
  CHECK_ARG(env, version);
  static emnapi_emscripten_version emscripten_version = {
    __EMSCRIPTEN_major__,
    __EMSCRIPTEN_minor__,
    __EMSCRIPTEN_tiny__
  };
  *version = &emscripten_version;
  return napi_clear_last_error(env);
}
#endif

napi_status napi_get_uv_event_loop(napi_env env,
                                   struct uv_loop_s** loop) {
#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
  CHECK_ENV(env);
  CHECK_ARG(env, loop);
  // Though this is fake libuv loop
  *loop = uv_default_loop();
  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

EMNAPI_INTERNAL_EXTERN int _emnapi_get_filename(char* buf, int len);

napi_status node_api_get_module_file_name(napi_env env,
                                          const char** result) {
  CHECK_ENV(env);
  CHECK_ARG(env, result);

  static char* filename = NULL;
  static const char* empty_string = "";

  if (filename != NULL) {
    free(filename);
    filename = NULL;
  }

  int len = _emnapi_get_filename(NULL, 0);
  if (len == 0) {
    *result = empty_string;
  } else {
    filename = (char*) malloc(len + 1);
    len = _emnapi_get_filename(filename, len + 1);
    *(filename + len) = '\0';
    *result = filename;
  }

  return napi_clear_last_error(env);
}

EXTERN_C_END
