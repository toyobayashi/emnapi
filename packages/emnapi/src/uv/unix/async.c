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

#ifdef __EMSCRIPTEN_PTHREADS__

#include <emscripten.h> /* version.h */
#include "../uv-common.h"

#ifndef EMNAPI_NEXTTICK_TYPE
#define EMNAPI_NEXTTICK_TYPE 0
#endif
#if EMNAPI_NEXTTICK_TYPE == 0
extern void _emnapi_set_immediate(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_set_immediate((callback), (data))
#elif EMNAPI_NEXTTICK_TYPE == 1
extern void _emnapi_next_tick(void (*callback)(void*), void* data);
#define NEXT_TICK(callback, data) _emnapi_next_tick((callback), (data))
#else
#error "Invalid EMNAPI_NEXTTICK_TYPE"
#endif

#ifndef EMNAPI_USE_PROXYING
  #if __EMSCRIPTEN_major__ * 10000 + __EMSCRIPTEN_minor__ * 100 + __EMSCRIPTEN_tiny__ >= 30109
  #define EMNAPI_USE_PROXYING 1
  #else
  #define EMNAPI_USE_PROXYING 0
  #endif
#endif

#if EMNAPI_USE_PROXYING
#include <emscripten/threading.h>
#include <emscripten/proxying.h>
#include <stdlib.h>
#include <errno.h>
#else
extern void _emnapi_async_send_js(int type,
                                  void (*callback)(void*),
                                  void* data);
#endif

int uv_async_init(uv_loop_t* loop, uv_async_t* handle, uv_async_cb async_cb) {
#if EMNAPI_USE_PROXYING
  em_proxying_queue* queue = em_proxying_queue_create();
  if (queue == NULL) return ENOMEM;
  handle->em_queue = queue;
#else
  handle->em_queue = NULL;
#endif
  handle->loop = loop;
  handle->type = UV_ASYNC;
  handle->async_cb = async_cb;
  QUEUE_INSERT_TAIL(&loop->async_handles, &handle->queue);
  return 0;
}

int uv_async_send(uv_async_t* handle) {
#if EMNAPI_USE_PROXYING
  pthread_t main_thread = emscripten_main_browser_thread_id();
  if (pthread_equal(main_thread, pthread_self())) {
    NEXT_TICK((void (*)(void *))handle->async_cb, handle);
  } else {
    // Neither emscripten_dispatch_to_thread_async nor MAIN_THREAD_ASYNC_EM_ASM
    // invoke the async_cb callback if there is a printf() in worker thread.
    // Using emscripten_proxy_async(emscripten_proxy_get_system_queue(), ...)
    // also has the same problem. Not sure what happens.
    // But creating a new queue is all ok.
    if (!emscripten_proxy_async(handle->em_queue,
                                main_thread,
                                (void (*)(void *))handle->async_cb,
                                handle)) {
      abort();
    }
  }
#else
  _emnapi_async_send_js(EMNAPI_NEXTTICK_TYPE,
                        (void (*)(void *))handle->async_cb,
                        handle);
#endif
  return 0;
}

void uv__async_close(uv_async_t* handle) {
  QUEUE_REMOVE(&handle->queue);
#if EMNAPI_USE_PROXYING
  if (handle->em_queue != NULL) {
    em_proxying_queue_destroy(handle->em_queue);
  }
#endif
  NEXT_TICK(((void (*)(void *))handle->close_cb), handle);
}

#endif
