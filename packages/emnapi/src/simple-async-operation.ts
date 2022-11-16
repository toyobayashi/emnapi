/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-unreachable */

// declare const PThread: any
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function __emnapi_async_send (callback: number, data: number): void

mergeInto(LibraryManager.library, {
  $emnapiAddSendListener__deps: ['$emnapiGetDynamicCalls'],
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
            // eslint-disable-next-line prefer-const
            let callback = data.emnapiAsyncSend.callback
            $from64('callback')
            emnapiGetDynamicCalls.call_vp(callback, data.emnapiAsyncSend.data)
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

  _emnapi_async_send__deps: ['$emnapiGetDynamicCalls', '$PThread', '$emnapiAddSendListener'],
  _emnapi_async_send: function (callback: number, data: number): void {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        emnapiAsyncSend: {
          callback,
          data
        }
      })
    } else {
      setTimeout(() => {
        $from64('callback')
        emnapiGetDynamicCalls.call_vp(callback, data)
      })
    }
  },
  _emnapi_async_send__postset:
    'PThread.unusedWorkers.forEach(emnapiAddSendListener);' +
    'PThread.runningWorkers.forEach(emnapiAddSendListener);' +
    'var __original_getNewWorker = PThread.getNewWorker; PThread.getNewWorker = function () {' +
      'var r = __original_getNewWorker.apply(this, arguments);' +
      'emnapiAddSendListener(r);' +
      'return r;' +
    '};'
})
