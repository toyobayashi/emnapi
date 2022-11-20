#ifdef __EMSCRIPTEN_PTHREADS__

#include "../uv-common.h"

int uv_loop_init(uv_loop_t* loop) {
  int err;
  QUEUE_INIT(&loop->wq);
  QUEUE_INIT(&loop->async_handles);
  err = uv_mutex_init(&loop->wq_mutex);
  if (err) goto fail_mutex_init;
  err = uv_async_init(loop, &loop->wq_async, uv__work_done);
  if (err) goto fail_async_init;
  return 0;

fail_async_init:
  uv_mutex_destroy(&loop->wq_mutex);

fail_mutex_init:
  return err;
}

void uv__loop_close(uv_loop_t* loop) {
  uv_mutex_lock(&loop->wq_mutex);
  assert(QUEUE_EMPTY(&loop->wq) && "thread pool work queue not empty!");
  assert(!uv__has_active_reqs(loop));
  uv_mutex_unlock(&loop->wq_mutex);
  uv_mutex_destroy(&loop->wq_mutex);
}

#endif
