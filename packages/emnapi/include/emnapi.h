#ifndef EMNAPI_INCLUDE_EMNAPI_H_
#define EMNAPI_INCLUDE_EMNAPI_H_

#include "js_native_api.h"
#include "emnapi_common.h"

typedef enum {
  emnapi_runtime,
  emnapi_userland,
} emnapi_ownership;

typedef enum {
  emnapi_int8_array,
  emnapi_uint8_array,
  emnapi_uint8_clamped_array,
  emnapi_int16_array,
  emnapi_uint16_array,
  emnapi_int32_array,
  emnapi_uint32_array,
  emnapi_float32_array,
  emnapi_float64_array,
  emnapi_bigint64_array,
  emnapi_biguint64_array,
  emnapi_data_view = -1,
  emnapi_buffer = -2,
} emnapi_memory_view_type;

EXTERN_C_START

EMNAPI_EXTERN int emnapi_is_support_weakref();
EMNAPI_EXTERN int emnapi_is_support_bigint();
EMNAPI_EXTERN int emnapi_is_node_binding_available();

EMNAPI_EXTERN
napi_status emnapi_await(napi_env env,
                         napi_value value,
                         napi_value* result);

#ifdef __EMSCRIPTEN__
EMNAPI_EXTERN
napi_status emnapi_get_module_object(napi_env env,
                                     napi_value* result);

EMNAPI_EXTERN
napi_status emnapi_get_module_property(napi_env env,
                                       const char* utf8name,
                                       napi_value* result);

typedef struct {
  uint32_t major;
  uint32_t minor;
  uint32_t patch;
} emnapi_emscripten_version;

EMNAPI_EXTERN
napi_status emnapi_get_emscripten_version(napi_env env,
                                          const emnapi_emscripten_version** version);
#endif

EMNAPI_EXTERN
napi_status emnapi_create_memory_view(napi_env env,
                                      emnapi_memory_view_type type,
                                      void* external_data,
                                      size_t byte_length,
                                      napi_finalize finalize_cb,
                                      void* finalize_hint,
                                      napi_value* result);


EMNAPI_EXTERN
napi_status emnapi_sync_memory(napi_env env,
                               bool js_to_wasm,
                               napi_value* arraybuffer_or_view,
                               size_t byte_offset,
                               size_t length);

EMNAPI_EXTERN
napi_status emnapi_get_memory_address(napi_env env,
                                      napi_value arraybuffer_or_view,
                                      void** address,
                                      emnapi_ownership* ownership,
                                      bool* runtime_allocated);

EXTERN_C_END

#endif
