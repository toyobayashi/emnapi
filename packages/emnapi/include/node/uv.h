#ifndef UV_H
#define UV_H

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#include <stddef.h>
#include "uv/unix.h"

#ifdef __cplusplus
extern "C" {
#endif

#define UV_EXTERN /* nothing */

typedef enum {
  UV_UNKNOWN_REQ = 0,
  UV_WORK = 7,
  UV_REQ_TYPE_MAX = 19
} uv_req_type;

typedef enum {
  UV_UNKNOWN_HANDLE = 0,
  UV_ASYNC = 1
} uv_handle_type;

typedef struct uv_loop_s uv_loop_t;
typedef struct uv_req_s uv_req_t;
typedef struct uv_work_s uv_work_t;
typedef struct uv_handle_s uv_handle_t;
typedef struct uv_async_s uv_async_t;

typedef void (*uv_work_cb)(uv_work_t* req);
typedef void (*uv_after_work_cb)(uv_work_t* req, int status);

#define UV_REQ_FIELDS                                                         \
  void* data;                                                                 \
  uv_req_type type;                                                           \

struct uv_req_s {
  UV_REQ_FIELDS
};

UV_EXTERN void uv_library_shutdown(void);
UV_EXTERN uv_loop_t* uv_default_loop(void);
UV_EXTERN int uv_loop_init(uv_loop_t* loop);
UV_EXTERN int uv_loop_close(uv_loop_t* loop);
UV_EXTERN void uv_sleep(unsigned int msec);

UV_EXTERN int uv_sem_init(uv_sem_t* sem, unsigned int value);
UV_EXTERN void uv_sem_destroy(uv_sem_t* sem);
UV_EXTERN void uv_sem_post(uv_sem_t* sem);
UV_EXTERN void uv_sem_wait(uv_sem_t* sem);

UV_EXTERN int uv_cond_init(uv_cond_t* cond);
UV_EXTERN void uv_cond_signal(uv_cond_t* cond);
UV_EXTERN void uv_cond_wait(uv_cond_t* cond, uv_mutex_t* mutex);
UV_EXTERN void uv_cond_destroy(uv_cond_t* cond);

UV_EXTERN void uv_once(uv_once_t* guard, void (*callback)(void));

struct uv_work_s {
  UV_REQ_FIELDS
  uv_loop_t* loop;
  uv_work_cb work_cb;
  uv_after_work_cb after_work_cb;
  struct uv__work work_req;
};

UV_EXTERN int uv_queue_work(uv_loop_t* loop,
                            uv_work_t* req,
                            uv_work_cb work_cb,
                            uv_after_work_cb after_work_cb);

UV_EXTERN int uv_cancel(uv_req_t* req);

UV_EXTERN int uv_mutex_init(uv_mutex_t* mutex);
UV_EXTERN void uv_mutex_destroy(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_lock(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_unlock(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_destroy(uv_mutex_t* cond);

typedef void (*uv_thread_cb)(void* arg);

UV_EXTERN int uv_thread_create(uv_thread_t* tid, uv_thread_cb entry, void* arg);
UV_EXTERN int uv_thread_join(uv_thread_t *tid);

typedef enum {
  UV_THREAD_NO_FLAGS = 0x00,
  UV_THREAD_HAS_STACK_SIZE = 0x01
} uv_thread_create_flags;

struct uv_thread_options_s {
  unsigned int flags;
  size_t stack_size;
};

typedef struct uv_thread_options_s uv_thread_options_t;

UV_EXTERN int uv_thread_create_ex(uv_thread_t* tid,
                                  const uv_thread_options_t* params,
                                  uv_thread_cb entry,
                                  void* arg);

typedef void (*uv_close_cb)(uv_handle_t* handle);
typedef void (*uv_async_cb)(uv_async_t* handle);

#define UV_HANDLE_FIELDS                                                      \
  /* public */                                                                \
  void* data;                                                                 \
  /* read-only */                                                             \
  uv_loop_t* loop;                                                            \
  uv_handle_type type;                                                        \
  uv_close_cb close_cb;                                                       \

struct uv_handle_s {
  UV_HANDLE_FIELDS
};

struct uv_async_s {
  UV_HANDLE_FIELDS
  uv_async_cb async_cb;
  void* queue[2];
  int pending;
};

UV_EXTERN int uv_async_init(uv_loop_t*,
                            uv_async_t* async,
                            uv_async_cb async_cb);
UV_EXTERN int uv_async_send(uv_async_t* async);

UV_EXTERN void uv_close(uv_handle_t* handle, uv_close_cb close_cb);

struct uv_loop_s {
  void* data;
  union {
    void* unused;
    unsigned int count;
  } active_reqs;
  void* wq[2];

  uv_mutex_t wq_mutex;
  uv_async_t wq_async;
  void* async_handles[2];
  void* em_queue;
};

#undef UV_REQ_FIELDS

#ifdef __cplusplus
}
#endif

#endif
#endif /* UV_H */
