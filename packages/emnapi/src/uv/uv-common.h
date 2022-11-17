#ifndef UV_COMMON_H_
#define UV_COMMON_H_

#ifdef __EMSCRIPTEN_PTHREADS__

#include <assert.h>
#include "uv.h"
#include "queue.h"

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


# define uv__handle_platform_init(h) ((h)->next_closing = NULL)

#define uv__handle_init(loop_, h, type_)                                      \
  do {                                                                        \
    (h)->loop = (loop_);                                                      \
    (h)->type = (type_);                                                      \
    (h)->flags = 0x00000008;  /* Ref the loop when active. */                 \
    QUEUE_INSERT_TAIL(&(loop_)->handle_queue, &(h)->handle_queue);            \
    uv__handle_platform_init(h);                                              \
  }                                                                           \
  while (0)

void uv__loop_close(uv_loop_t* loop);

#endif

#endif /* UV_COMMON_H_ */
