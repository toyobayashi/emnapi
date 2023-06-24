#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#include <errno.h>
#include <string.h>
#include "uv-common.h"

static uv_loop_t default_loop_struct;
static uv_loop_t* default_loop_ptr;


uv_loop_t* uv_default_loop(void) {
  if (default_loop_ptr != NULL)
    return default_loop_ptr;

  if (uv_loop_init(&default_loop_struct))
    return NULL;

  default_loop_ptr = &default_loop_struct;
  return default_loop_ptr;
}

int uv_loop_close(uv_loop_t* loop) {
  // QUEUE* q;
  // uv_handle_t* h;
#ifndef NDEBUG
  void* saved_data;
#endif

  if (uv__has_active_reqs(loop))
    return EBUSY;

  // QUEUE_FOREACH(q, &loop->handle_queue) {
  //   h = QUEUE_DATA(q, uv_handle_t, handle_queue);
  //   if (!(h->flags & UV_HANDLE_INTERNAL))
  //     return UV_EBUSY;
  // }

  uv__loop_close(loop);

#ifndef NDEBUG
  saved_data = loop->data;
  memset(loop, -1, sizeof(*loop));
  loop->data = saved_data;
#endif
  if (loop == default_loop_ptr)
    default_loop_ptr = NULL;

  return 0;
}

#if defined(__GNUC__) && !defined(_WIN32)
__attribute__((destructor))
#endif
void uv_library_shutdown(void) {
  static int was_shutdown;

  if (uv__exchange_int_relaxed(&was_shutdown, 1))
    return;

//   uv__process_title_cleanup();
//   uv__signal_cleanup();
// #ifdef __MVS__
//   /* TODO(itodorov) - zos: revisit when Woz compiler is available. */
//   uv__os390_cleanup();
// #else
  uv__threadpool_cleanup();
// #endif
}

#endif
