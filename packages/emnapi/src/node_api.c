#include "node_api.h"
#include "emnapi_internal.h"

#if EMNAPI_HAVE_THREADS
#include "uv.h"
#endif

EXTERN_C_START

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

napi_status napi_get_uv_event_loop(napi_env env,
                                   struct uv_loop_s** loop) {
#if EMNAPI_HAVE_THREADS
  CHECK_ENV(env);
  CHECK_ARG(env, loop);
  // Though this is fake libuv loop
  *loop = uv_default_loop();
  return napi_clear_last_error(env);
#else
  return napi_set_last_error(env, napi_generic_failure, 0, NULL);
#endif
}

EMNAPI_INTERNAL_EXTERN int _emnapi_get_filename(napi_env env, char* buf, int len);

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

  int len = _emnapi_get_filename(env, NULL, 0);
  if (len == 0) {
    *result = empty_string;
  } else {
    filename = (char*) malloc(len + 1);
    len = _emnapi_get_filename(env, filename, len + 1);
    *(filename + len) = '\0';
    *result = filename;
  }

  return napi_clear_last_error(env);
}

EXTERN_C_END
