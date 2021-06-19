#ifndef EMNAPI_INCLUDE_EMNAPI_H_
#define EMNAPI_INCLUDE_EMNAPI_H_

#include "js_native_api_types.h"
#include "common.h"

EXTERN_C_START

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

EXTERN_C_END

#endif
