#ifndef EMNAPI_INCLUDE_COMMON_H_
#define EMNAPI_INCLUDE_COMMON_H_

#define NAPI_EXTERN __attribute__((visibility("default")))                \
                    __attribute__((__import_module__("env")))

#ifdef __cplusplus
#define EXTERN_C_START extern "C" {
#define EXTERN_C_END }
#else
#define EXTERN_C_START
#define EXTERN_C_END
#endif

#endif
