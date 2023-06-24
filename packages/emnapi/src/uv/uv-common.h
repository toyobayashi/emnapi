#ifndef UV_COMMON_H_
#define UV_COMMON_H_

#if defined(__EMSCRIPTEN__)
  #ifndef EMNAPI_USE_PROXYING
    #include <emscripten.h> /* version.h */
    #if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30109
    #define EMNAPI_USE_PROXYING 1
    #else
    #define EMNAPI_USE_PROXYING 0
    #endif
  #endif
#else
  #define EMNAPI_USE_PROXYING 0
#endif

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)
#include <assert.h>
#include "uv.h"
#include "queue.h"
#ifndef _MSC_VER
# include <stdatomic.h>
#endif

#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))
// #define offsetof(s, m) __builtin_offsetof(s, m)
#define container_of(ptr, type, member) \
  ((type *) ((char *) (ptr) - offsetof(type, member)))

#define UV_REQ_INIT(req, typ)                                                 \
  do {                                                                        \
    (req)->type = (typ);                                                      \
  }                                                                           \
  while (0)

#define uv__has_active_reqs(loop)                                             \
  ((loop)->active_reqs.count > 0)

#define uv__req_register(loop, req)                                           \
  do {                                                                        \
    (loop)->active_reqs.count++;                                              \
  }                                                                           \
  while (0)

#define uv__req_unregister(loop, req)                                         \
  do {                                                                        \
    assert(uv__has_active_reqs(loop));                                        \
    (loop)->active_reqs.count--;                                              \
  }                                                                           \
  while (0)

#define uv__req_init(loop, req, typ)                                          \
  do {                                                                        \
    UV_REQ_INIT(req, typ);                                                    \
    uv__req_register(loop, req);                                              \
  }                                                                           \
  while (0)

#define uv__exchange_int_relaxed(p, v)                                        \
  atomic_exchange_explicit((_Atomic int*)(p), v, memory_order_relaxed)

enum uv__work_kind {
  UV__WORK_CPU,
  UV__WORK_FAST_IO,
  UV__WORK_SLOW_IO
};

void uv__threadpool_cleanup(void);
void uv__work_done(uv_async_t* handle);
void uv__loop_close(uv_loop_t* loop);
void uv__async_close(uv_async_t* handle);

#endif

#endif /* UV_COMMON_H_ */
