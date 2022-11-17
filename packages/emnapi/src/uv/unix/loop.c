#include "../uv-common.h"

#ifdef __EMSCRIPTEN_PTHREADS__

int uv_loop_init(uv_loop_t* loop) {
  int err;
  QUEUE_INIT(&loop->wq);
  err = uv_mutex_init(&loop->wq_mutex);
  if (err) return err;
  return 0;
}

void uv__loop_close(uv_loop_t* loop) {
  uv_mutex_lock(&loop->wq_mutex);
  assert(QUEUE_EMPTY(&loop->wq) && "thread pool work queue not empty!");
  assert(!uv__has_active_reqs(loop));
  uv_mutex_unlock(&loop->wq_mutex);
  uv_mutex_destroy(&loop->wq_mutex);
}

#endif
