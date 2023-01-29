#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#include "../uv-common.h"

int _emnapi_create_proxying_queue(uv_loop_t* loop);
void _emnapi_destroy_proxying_queue(uv_loop_t* loop);

int uv_loop_init(uv_loop_t* loop) {
  int err;
  QUEUE_INIT(&loop->wq);
  QUEUE_INIT(&loop->async_handles);
  err = _emnapi_create_proxying_queue(loop);
  if (err) return err;
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
  _emnapi_destroy_proxying_queue(loop);
  uv_mutex_unlock(&loop->wq_mutex);
  uv_mutex_destroy(&loop->wq_mutex);
}

#endif
