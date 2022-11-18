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

// #include <emscripten/threading.h>
#include "../uv-common.h"

#include "common.h"

// #ifdef __wasm64__
// #define __EMNAPI_ASYNC_SEND_CALLBACK_SIG \
//   (EM_FUNC_SIG_RETURN_VALUE_V | \
//   EM_FUNC_SIG_WITH_N_PARAMETERS(1) | \
//   EM_FUNC_SIG_SET_PARAM(0, EM_FUNC_SIG_PARAM_I64))
// #else
// #define __EMNAPI_ASYNC_SEND_CALLBACK_SIG EM_FUNC_SIG_VI
// #endif

extern void _emnapi_async_send_js(int type,
                                  void (*callback)(void*),
                                  void* data);

int uv_async_init(uv_loop_t* loop, uv_async_t* handle, uv_async_cb async_cb) {
  handle->loop = loop;
  handle->type = UV_ASYNC;
  handle->async_cb = async_cb;
  QUEUE_INSERT_TAIL(&loop->async_handles, &handle->queue);
  return 0;
}

int uv_async_send(uv_async_t* handle) {
  // TODO(?): need help
  // Neither emscripten_dispatch_to_thread_async nor MAIN_THREAD_ASYNC_EM_ASM
  // invoke the async complete callback if there is a printf() in worker thread.
  // This breaks "packages/test/pool" tests.
  // Not sure what happens, maybe has deadlock,
  // and not sure whether this is Emscripten bug or my incorrect usage.
  // BTW emscripten_dispatch_to_thread_async seems
  // not support __wasm64__ V_I64 signature yet

  // pthread_t main_thread = emscripten_main_browser_thread_id();
  // if (pthread_equal(main_thread, pthread_self())) {
  //   NEXT_TICK(handle->async_cb, handle);
  // } else {
  //   emscripten_dispatch_to_thread_async(main_thread,
  //                                       __EMNAPI_ASYNC_SEND_CALLBACK_SIG,
  //                                       handle->async_cb,
  //                                       NULL,
  //                                       handle);
  //   // or
  //   // MAIN_THREAD_ASYNC_EM_ASM({
  //   //   emnapiGetDynamicCalls.call_vp($0, $1);
  //   // }, handle->async_cb, handle);
  // }

  // Currently still use JavaScript to send work
  // it's simple and clear
  _emnapi_async_send_js(EMNAPI_ASYNC_SEND_TYPE, (void (*)(void *))handle->async_cb, handle);
  return 0;
}

void uv__async_close(uv_async_t* handle) {
  QUEUE_REMOVE(&handle->queue);
  NEXT_TICK(((void (*)(void *))handle->close_cb), handle);
}

#endif
