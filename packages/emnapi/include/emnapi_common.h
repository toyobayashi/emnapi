#ifndef EMNAPI_INCLUDE_COMMON_H_
#define EMNAPI_INCLUDE_COMMON_H_

#ifdef __EMSCRIPTEN__
#define NAPI_EXTERN __attribute__((__import_module__("env")))

#define EMNAPI_EXTERN __attribute__((__import_module__("env")))
#else
#define NAPI_EXTERN __attribute__((__import_module__("napi")))

#define EMNAPI_EXTERN __attribute__((__import_module__("emnapi")))
#endif

#define EMNAPI_INTERNAL_EXTERN __attribute__((__import_module__("env")))

#ifdef __cplusplus
#define EXTERN_C_START extern "C" {
#define EXTERN_C_END }
#else
#define EXTERN_C_START
#define EXTERN_C_END
#endif

#endif
