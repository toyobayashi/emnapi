/* eslint-disable @typescript-eslint/no-floating-promises */

import { ENVIRONMENT_IS_NODE, wasmMemory, ENVIRONMENT_IS_PTHREAD, napiModule } from './init'
import { _emnapi_set_immediate, _emnapi_next_tick } from '../util'

import { PThread } from './pthread'

function emnapiGetWorkerByPthreadPtr (pthreadPtr: number): any {
  const view = new DataView(wasmMemory.buffer)
  /**
   * wasi-sdk-20.0+threads
   *
   * struct pthread {
   *   struct pthread *self;        // 0
   *   struct pthread *prev, *next; // 4, 8
   *   uintptr_t sysinfo;           // 12
   *   uintptr_t canary;            // 16
   *   int tid;                     // 20
   *   // ...
   * }
   */
  const tidOffset = 20
  const tid = view.getInt32(pthreadPtr + tidOffset, true)
  const worker = PThread.pthreads[tid]
  return worker
}

/** @__sig vp */
export function _emnapi_worker_unref (pthreadPtr: number): void {
  if (ENVIRONMENT_IS_PTHREAD) return
  const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr)
  if (worker && typeof worker.unref === 'function') {
    worker.unref()
  }
}

/** @__sig vipp */
export function _emnapi_async_send_js (type: number, callback: number, data: number): void {
  if (ENVIRONMENT_IS_PTHREAD) {
    const postMessage = napiModule.postMessage!
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

// function ptrToString (ptr: number): string {
//   return '0x' + ('00000000' + ptr.toString(16)).slice(-8)
// }

var uvThreadpoolReadyResolve: () => void
var uvThreadpoolReady: Promise<void> & { ready: boolean } = new Promise<void>((resolve) => {
  uvThreadpoolReadyResolve = function () {
    uvThreadpoolReady.ready = true
    resolve()
  }
}) as any
uvThreadpoolReady.ready = false

/** @__sig i */
export function _emnapi_is_main_browser_thread (): number {
  return (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) ? 1 : 0
}

/** @__sig vppi */
export function _emnapi_after_uvthreadpool_ready (callback: number, q: number, type: number): void {
  if (uvThreadpoolReady.ready) {
    $makeDynCall('vpi', 'callback')($to64('q'), type)
  } else {
    uvThreadpoolReady.then(() => {
      $makeDynCall('vpi', 'callback')($to64('q'), type)
    })
  }
}

/** @__sig vpi */
export function _emnapi_tell_js_uvthreadpool (threads: number, size: number): void {
  const p = [] as Array<Promise<void>>
  for (let i = 0; i < size; i++) {
    const pthreadPtr = $makeGetValue('threads', 'i * ' + POINTER_SIZE, '*')
    const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr)
    p.push(new Promise<void>((resolve) => {
      const handler = function (e: any): void {
        const data = ENVIRONMENT_IS_NODE ? e : e.data
        const __emnapi__ = data.__emnapi__
        if (__emnapi__ && __emnapi__.type === 'async-thread-ready') {
          resolve()
          if (worker && typeof worker.unref === 'function') {
            worker.unref()
          }
          if (ENVIRONMENT_IS_NODE) {
            worker.off('message', handler)
          } else {
            worker.removeEventListener('message', handler)
          }
        }
      }
      if (ENVIRONMENT_IS_NODE) {
        worker.on('message', handler)
      } else {
        worker.addEventListener('message', handler)
      }
    }))
  }
  Promise.all(p).then(uvThreadpoolReadyResolve)
}

/** @__sig v */
export function _emnapi_emit_async_thread_ready (): void {
  if (!ENVIRONMENT_IS_PTHREAD) return
  const postMessage = napiModule.postMessage!
  postMessage({
    __emnapi__: {
      type: 'async-thread-ready',
      payload: {}
    }
  })
}
