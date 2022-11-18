#ifdef __EMSCRIPTEN_PTHREADS__

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

#endif
