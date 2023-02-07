declare const PThread: any

mergeInto(LibraryManager.library, {
  _emnapi_worker_unref__sig: 'vp',
  _emnapi_worker_unref__deps: ['$PThread'],
  _emnapi_worker_unref: function (pid: number): void {
    let worker = PThread.pthreads[pid]
    worker = worker.worker || worker
    if (typeof worker.unref === 'function') {
      worker.unref()
    }
  },

  // if EMNAPI_USE_PROXYING=1 (default is 1 if emscripten version >= 3.1.9),
  // the following helpers won't be linked into runtime code
  $emnapiAddSendListener__deps: ['$PThread'],
  $emnapiAddSendListener__postset:
    'PThread.unusedWorkers.forEach(emnapiAddSendListener);' +
    'PThread.runningWorkers.forEach(emnapiAddSendListener);' +
    '(function () { var __original_getNewWorker = PThread.getNewWorker; PThread.getNewWorker = function () {' +
      'var r = __original_getNewWorker.apply(this, arguments);' +
      'emnapiAddSendListener(r);' +
      'return r;' +
    '}; })();',
  $emnapiAddSendListener: function (worker: any) {
    if (worker && !worker._emnapiSendListener) {
      worker._emnapiSendListener = function _emnapiSendListener (e: any) {
        const data = ENVIRONMENT_IS_NODE ? e : e.data
        if (data.emnapiAsyncSend) {
          if (ENVIRONMENT_IS_PTHREAD) {
            postMessage({
              emnapiAsyncSend: data.emnapiAsyncSend
            })
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const callback = data.emnapiAsyncSend.callback
            $makeDynCall('vp', 'callback')(data.emnapiAsyncSend.data)
          }
        }
      }
      if (ENVIRONMENT_IS_NODE) {
        worker.on('message', worker._emnapiSendListener)
      } else {
        worker.addEventListener('message', worker._emnapiSendListener, false)
      }
    }
  },

  _emnapi_async_send_js__sig: 'vipp',
  _emnapi_async_send_js__deps: [
    '$emnapiAddSendListener',
    '_emnapi_set_immediate',
    '_emnapi_next_tick'
  ],
  _emnapi_async_send_js: function (type: number, callback: number, data: number): void {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        emnapiAsyncSend: {
          callback,
          data
        }
      })
    } else {
      switch (type) {
        case 0: __emnapi_set_immediate(callback, data); break
        case 1: __emnapi_next_tick(callback, data); break
        default: break
      }
    }
  }
})
