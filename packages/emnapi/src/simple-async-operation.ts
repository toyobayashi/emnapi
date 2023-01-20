/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-unreachable */

declare const PThread: any
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// declare function __emnapi_async_send_js (callback: number, data: number): void
declare function __emnapi_set_immediate (callback: number, data: number): void
declare function __emnapi_next_tick (callback: number, data: number): void
declare function __emnapi_worker_ref (pid: number): void
declare function __emnapi_worker_unref (pid: number): void
declare function __emnapi_ref_worker_js (type: number, pid: number): void

mergeInto(LibraryManager.library, {
  _emnapi_set_immediate__sig: 'vpp',
  _emnapi_set_immediate__deps: ['$emnapiInit', '$emnapiCtx'],
  _emnapi_set_immediate: function (callback: number, data: number): void {
    emnapiCtx.feature.setImmediate(() => {
      $makeDynCall('vp', 'callback')(data)
    })
  },

  _emnapi_next_tick__sig: 'vpp',
  _emnapi_next_tick: function (callback: number, data: number): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.resolve().then(() => {
      $makeDynCall('vp', 'callback')(data)
    })
  },

  _emnapi_worker_unref__sig: 'vp',
  _emnapi_worker_unref__deps: ['$PThread'],
  _emnapi_worker_unref: function (pid: number): void {
    let worker = PThread.pthreads[pid]
    worker = worker.worker || worker
    if (typeof worker.unref === 'function') {
      worker.unref()
    }
  },
  _emnapi_worker_ref__sig: 'vp',
  _emnapi_worker_ref__deps: ['$PThread'],
  _emnapi_worker_ref: function (pid: number): void {
    let worker = PThread.pthreads[pid]
    worker = worker.worker || worker
    if (typeof worker.ref === 'function') {
      worker.ref()
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
        } else if (data.emnapiRefWorker) {
          if (ENVIRONMENT_IS_PTHREAD) {
            postMessage({
              emnapiRefWorker: data.emnapiRefWorker
            })
          } else {
            if (typeof __emnapi_ref_worker_js === 'function') {
              __emnapi_ref_worker_js(data.emnapiRefWorker.type, data.emnapiRefWorker.pid)
            }
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
  },

  _emnapi_ref_worker_js__sig: 'vip',
  _emnapi_ref_worker_js__deps: [
    '$emnapiAddSendListener',
    '_emnapi_worker_unref',
    '_emnapi_worker_ref'
  ],
  _emnapi_ref_worker_js: function (type: number, pid: number): void {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        emnapiRefWorker: { type, pid }
      })
    } else {
      switch (type) {
        case 0: __emnapi_worker_unref(pid); break
        case 1: __emnapi_worker_ref(pid); break
        default: break
      }
    }
  }
})

function _emnapi_call_into_module (env: napi_env, callback: number, data: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  const scope = emnapiCtx.openScope(envObject)
  try {
    envObject.callIntoModule(() => {
      $makeDynCall('vpp', 'callback')(env, data)
    })
  } finally {
    emnapiCtx.closeScope(envObject, scope)
  }
}

function _emnapi_ctx_increase_waiting_request_counter (): void {
  emnapiCtx.increaseWaitingRequestCounter()
}

function _emnapi_ctx_decrease_waiting_request_counter (): void {
  emnapiCtx.decreaseWaitingRequestCounter()
}

emnapiImplement('_emnapi_call_into_module', 'vppp', _emnapi_call_into_module)
emnapiImplement('_emnapi_ctx_increase_waiting_request_counter', 'v', _emnapi_ctx_increase_waiting_request_counter)
emnapiImplement('_emnapi_ctx_decrease_waiting_request_counter', 'v', _emnapi_ctx_decrease_waiting_request_counter)
