#include "emnapi_common.h"

EXTERN_C_START

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

EXTERN_C_END
