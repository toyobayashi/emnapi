import { ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD } from 'emnapi:emscripten-runtime'
import { _emnapi_set_immediate, _emnapi_next_tick } from '../util'

declare var PThread: any

/**
 * @__deps $PThread
 * @__sig vp
 */
export function _emnapi_worker_unref (pid: number): void {
  let worker = PThread.pthreads[pid]
  worker = worker.worker || worker
  if (typeof worker.unref === 'function') {
    worker.unref()
  }
}

/**
 * if EMNAPI_USE_PROXYING=1 (default is 1 if emscripten version >= 3.1.9),
 * the following helpers won't be linked into runtime code
 *
 * @__deps $PThread
 * @__postset
 * ```
 * PThread.unusedWorkers.forEach(emnapiAddSendListener);
 * PThread.runningWorkers.forEach(emnapiAddSendListener);
 * (function () {
 *   var __original_getNewWorker = PThread.getNewWorker;
 *   PThread.getNewWorker = function () {
 *     var r = __original_getNewWorker.apply(this, arguments);
 *     emnapiAddSendListener(r);
 *     return r;
 *   };
 * })();
 * ```
 */
export function $emnapiAddSendListener (worker: any): boolean {
  if (!worker) return false
  if (worker._emnapiSendListener) return true
  const handler = function (e: any): void {
    const data = ENVIRONMENT_IS_NODE ? e : e.data
    const __emnapi__ = data.__emnapi__
    if (__emnapi__ && __emnapi__.type === 'async-send') {
      if (ENVIRONMENT_IS_PTHREAD) {
        postMessage({ __emnapi__ })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const callback = __emnapi__.payload.callback
        $makeDynCall('vp', 'callback')(__emnapi__.payload.data)
      }
    }
  }
  const dispose = function (): void {
    if (ENVIRONMENT_IS_NODE) {
      worker.off('message', handler)
    } else {
      worker.removeEventListener('message', handler, false)
    }
    delete worker._emnapiSendListener
  }
  worker._emnapiSendListener = { handler, dispose }
  if (ENVIRONMENT_IS_NODE) {
    worker.on('message', handler)
  } else {
    worker.addEventListener('message', handler, false)
  }
  return true
}

/**
 * @__sig vipp
 */
export function _emnapi_async_send_js (type: number, callback: number, data: number): void {
  if (ENVIRONMENT_IS_PTHREAD) {
    postMessage({
      __emnapi__: {
        type: 'async-send',
        payload: {
          callback,
          data
        }
      }
    })
  } else {
    switch (type) {
      case 0: _emnapi_set_immediate(callback, data); break
      case 1: _emnapi_next_tick(callback, data); break
      default: break
    }
  }
}
