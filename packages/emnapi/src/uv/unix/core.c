#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#include <errno.h>
#include <time.h>
#include "../uv-common.h"

void uv_close(uv_handle_t* handle, uv_close_cb close_cb) {
  handle->close_cb = close_cb;

  switch (handle->type) {
  case UV_ASYNC:
    uv__async_close((uv_async_t*)handle);
    break;
  default:
    assert(0);
  }
}

int nanosleep(const struct timespec *, struct timespec *);

void uv_sleep(unsigned int msec) {
  struct timespec timeout;
  int rc;

  timeout.tv_sec = msec / 1000;
  timeout.tv_nsec = (msec % 1000) * 1000 * 1000;

  do
    rc = nanosleep(&timeout, &timeout);
  while (rc == -1 && errno == EINTR);

  assert(rc == 0);
}

#endif
