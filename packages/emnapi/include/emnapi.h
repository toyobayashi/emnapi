#ifndef EMNAPI_INCLUDE_EMNAPI_H_
#define EMNAPI_INCLUDE_EMNAPI_H_

#include "js_native_api.h"
#include "common.h"

typedef struct {
  uint32_t major;
  uint32_t minor;
  uint32_t patch;
} emnapi_emscripten_version;

EXTERN_C_START

NAPI_EXTERN
napi_status emnapi_get_module_object(napi_env env,
                                     napi_value* result);

NAPI_EXTERN
napi_status emnapi_get_module_property(napi_env env,
                                       const char* utf8name,
                                       napi_value* result);

NAPI_EXTERN
napi_status emnapi_create_external_uint8array(napi_env env,
                                              void* external_data,
                                              size_t byte_length,
                                              napi_finalize finalize_cb,
                                              void* finalize_hint,
                                              napi_value* result);

NAPI_EXTERN
napi_status emnapi_get_emscripten_version(napi_env env,
                                          const emnapi_emscripten_version** version);

EXTERN_C_END

#endif
