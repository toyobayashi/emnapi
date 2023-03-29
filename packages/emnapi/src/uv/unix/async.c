/* Copyright Joyent, Inc. and other Node contributors. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/* This file contains both the uv__async internal infrastructure and the
 * user-facing uv_async_t functions.
 */

#if defined(__EMSCRIPTEN_PTHREADS__) || defined(_REENTRANT)

#include <stdlib.h>
#include <sched.h>
#include "../uv-common.h"
#include "emnapi_common.h"

#if defined(__clang__) ||                                                     \
    defined(__GNUC__) ||                                                      \
    defined(__INTEL_COMPILER)
# define UV_UNUSED(declaration)     __attribute__((unused)) declaration
#else
# define UV_UNUSED(declaration)     declaration
#endif

UV_UNUSED(static int cmpxchgi(int* ptr, int oldval, int newval));

UV_UNUSED(static int cmpxchgi(int* ptr, int oldval, int newval)) {
  return __sync_val_compare_and_swap(ptr, oldval, newval);
}

#ifndef EMNAPI_NEXTTICK_TYPE
#define EMNAPI_NEXTTICK_TYPE 0
#endif
#if EMNAPI_NEXTTICK_TYPE == 0
EMNAPI_INTERNAL_EXTERN void _emnapi_set_immediate(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_set_immediate((callback), (data))
#elif EMNAPI_NEXTTICK_TYPE == 1
EMNAPI_INTERNAL_EXTERN void _emnapi_next_tick(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_next_tick((callback), (data))
#else
#error "Invalid EMNAPI_NEXTTICK_TYPE"
#endif

#if EMNAPI_USE_PROXYING
#include <emscripten/threading.h>
#include <emscripten/proxying.h>
#include <errno.h>

int _emnapi_create_proxying_queue(uv_loop_t* loop) {
  em_proxying_queue* queue = em_proxying_queue_create();
  loop->em_queue = queue;
  if (queue == NULL) return ENOMEM;
  return 0;
}

void _emnapi_destroy_proxying_queue(uv_loop_t* loop) {
  if (loop->em_queue != NULL) {
    em_proxying_queue_destroy(loop->em_queue);
  }
}

#else
EMNAPI_INTERNAL_EXTERN void _emnapi_async_send_js(int type,
                                  void (*callback)(void*),
                                  void* data);

int _emnapi_create_proxying_queue(uv_loop_t* loop) {
  loop->em_queue = NULL;
  return 0;
}

void _emnapi_destroy_proxying_queue(uv_loop_t* loop) {}

#endif

int uv_async_init(uv_loop_t* loop, uv_async_t* handle, uv_async_cb async_cb) {
  handle->loop = loop;
  handle->type = UV_ASYNC;
  handle->async_cb = async_cb;
  handle->pending = 0;
  QUEUE_INSERT_TAIL(&loop->async_handles, &handle->queue);
  return 0;
}

/* Only call this from the event loop thread. */
static int uv__async_spin(uv_async_t* handle) {
  int i;
  int rc;

  for (;;) {
    /* 997 is not completely chosen at random. It's a prime number, acyclical
     * by nature, and should therefore hopefully dampen sympathetic resonance.
     */
    for (i = 0; i < 997; i++) {
      /* rc=0 -- handle is not pending.
       * rc=1 -- handle is pending, other thread is still working with it.
       * rc=2 -- handle is pending, other thread is done.
       */
      rc = cmpxchgi(&handle->pending, 2, 0);

      if (rc != 1)
        return rc;

      /* Other thread is busy with this handle, spin until it's done. */
      // cpu_relax();
    }

    /* Yield the CPU. We may have preempted the other thread while it's
     * inside the critical section and if it's running on the same CPU
     * as us, we'll just burn CPU cycles until the end of our time slice.
     */
    sched_yield();
  }
}

static void uv__async_io(uv_loop_t* loop) {
  QUEUE queue;
  QUEUE* q;
  uv_async_t* h;

  QUEUE_MOVE(&loop->async_handles, &queue);
  while (!QUEUE_EMPTY(&queue)) {
    q = QUEUE_HEAD(&queue);
    h = QUEUE_DATA(q, uv_async_t, queue);

    QUEUE_REMOVE(q);
    QUEUE_INSERT_TAIL(&loop->async_handles, q);

    if (0 == uv__async_spin(h))
      continue;  /* Not pending. */

    if (h->async_cb == NULL)
      continue;

    h->async_cb(h);
  }
}

#if EMNAPI_USE_PROXYING

#undef emscripten_main_browser_thread_id

__attribute__((weak))
pthread_t emscripten_main_browser_thread_id(void) {
  return NULL;
}

__attribute__((weak))
pthread_t emscripten_main_runtime_thread_id(void) {
  return emscripten_main_browser_thread_id();
}
#endif

static void uv__async_send(uv_loop_t* loop) {
#if EMNAPI_USE_PROXYING
  pthread_t main_thread = emscripten_main_runtime_thread_id();
  assert(main_thread != NULL);
  if (pthread_equal(main_thread, pthread_self())) {
    NEXT_TICK((void (*)(void *))uv__async_io, loop);
  } else {
    // Neither emscripten_dispatch_to_thread_async nor MAIN_THREAD_ASYNC_EM_ASM
    // invoke the async_cb callback if there is a printf() in worker thread.
    // Using emscripten_proxy_async(emscripten_proxy_get_system_queue(), ...)
    // also has the same problem. Not sure what happens.
    // But creating a new queue is all ok.
    if (!emscripten_proxy_async(loop->em_queue,
                                main_thread,
                                (void (*)(void *))uv__async_io,
                                loop)) {
      abort();
    }
  }
#else
  _emnapi_async_send_js(EMNAPI_NEXTTICK_TYPE,
                        (void (*)(void *))uv__async_io,
                        loop);
#endif
}

#define ACCESS_ONCE(type, var) (*(volatile type*) &(var))

int uv_async_send(uv_async_t* handle) {
  /* Do a cheap read first. */
  if (ACCESS_ONCE(int, handle->pending) != 0)
    return 0;

  /* Tell the other thread we're busy with the handle. */
  if (cmpxchgi(&handle->pending, 0, 1) != 0)
    return 0;

  /* Wake up the other thread's event loop. */
  uv__async_send(handle->loop);

  /* Tell the other thread we're done. */
  if (cmpxchgi(&handle->pending, 1, 2) != 1)
    abort();

  return 0;
}

void uv__async_close(uv_async_t* handle) {
  uv__async_spin(handle);
  QUEUE_REMOVE(&handle->queue);
  NEXT_TICK(((void (*)(void *))handle->close_cb), handle);
}

#endif
