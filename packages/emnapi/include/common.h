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

#ifdef __EMSCRIPTEN_PTHREADS__

#ifndef EMNAPI_ASYNC_SEND_TYPE
#define EMNAPI_ASYNC_SEND_TYPE 0
#endif
#if EMNAPI_ASYNC_SEND_TYPE == 0
extern void _emnapi_set_immediate(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_set_immediate((callback), (data))
#elif EMNAPI_ASYNC_SEND_TYPE == 1
extern void _emnapi_next_tick(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_next_tick((callback), (data))
#else
#error "Invalid EMNAPI_ASYNC_SEND_TYPE"
#endif

#endif

#endif
