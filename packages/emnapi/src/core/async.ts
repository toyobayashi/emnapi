/* eslint-disable @typescript-eslint/no-floating-promises */

function terminateWorker (worker: any): void {
  const tid = worker.__emnapi_tid
  worker.terminate()
  worker.onmessage = (e: any) => {
    if (e.data.__emnapi__) {
      err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid)
    }
  }
}

var PThread = {
  unusedWorkers: [] as any[],
  runningWorkers: [] as any[],
  pthreads: Object.create(null),
  nextWorkerID: 0,
  init () {},
  returnWorkerToPool (worker: any) {
    var tid = worker.__emnapi_tid
    delete PThread.pthreads[tid]
    PThread.unusedWorkers.push(worker)
    PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1)
    delete worker.__emnapi_tid
    if (ENVIRONMENT_IS_NODE) {
      worker.unref()
    }
  },
  loadWasmModuleToWorker: (worker: any) => {
    if (worker.whenLoaded) return worker.whenLoaded
    worker.whenLoaded = new Promise<any>((resolve, reject) => {
      worker.onmessage = function (e: any) {
        if (e.data.__emnapi__) {
          const type = e.data.__emnapi__.type
          const payload = e.data.__emnapi__.payload
          if (type === 'loaded') {
            worker.loaded = true
            if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
              worker.unref()
            }
            resolve(worker)
            // if (payload.err) {
            //   err('failed to load in child thread: ' + (payload.err.message || payload.err))
            // }
          } else if (type === 'spawn-thread') {
            spawnThread(payload.startArg, payload.errorOrTid)
          } else if (type === 'cleanup-thread') {
            if (reuseWorker) {
              PThread.returnWorkerToPool(worker)
            } else {
              delete PThread.pthreads[payload.tid]
              PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1)
              terminateWorker(worker)
              delete worker.__emnapi_tid
            }
          }
        }
      }
      worker.onerror = (e: any) => {
        const message = 'worker sent an error!'
        // if (worker.pthread_ptr) {
        //   message = 'Pthread ' + ptrToString(worker.pthread_ptr) + ' sent an error!'
        // }
        err(message + ' ' + e.message)
        reject(e)
        throw e
      }
      if (ENVIRONMENT_IS_NODE) {
        worker.on('message', function (data: any) {
          worker.onmessage({
            data
          })
        })
        worker.on('error', function (e: any) {
          worker.onerror(e)
        })
        worker.on('detachedExit', function () {})
      }
      // napiModule.emnapi.addSendListener(worker)
      emnapiAddSendListener(worker)
      if (typeof emnapiTSFN !== 'undefined') {
        emnapiTSFN.addListener(worker)
      }
      try {
        worker.postMessage({
          __emnapi__: {
            type: 'load',
            payload: {
              wasmModule,
              wasmMemory
            }
          }
        })
      } catch (err) {
        if (typeof SharedArrayBuffer === 'undefined' || !(wasmMemory.buffer instanceof SharedArrayBuffer)) {
          throw new Error(
            'Multithread features require shared wasm memory. ' +
            'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking'
          )
        }
        throw err
      }
    })
    return worker.whenLoaded
  },
  allocateUnusedWorker () {
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not provided')
    }
    const worker = onCreateWorker({ type: 'pthread' })
    PThread.unusedWorkers.push(worker)
    return worker
  },
  getNewWorker () {
    if (reuseWorker) {
      if (PThread.unusedWorkers.length === 0) {
        const worker = PThread.allocateUnusedWorker()
        PThread.loadWasmModuleToWorker(worker)
      }
      return PThread.unusedWorkers.pop()
    }
    const worker = PThread.allocateUnusedWorker()
    PThread.loadWasmModuleToWorker(worker)
    return worker
  }
}

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

function __emnapi_worker_unref (pthreadPtr: number): void {
  if (ENVIRONMENT_IS_PTHREAD) return
  const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr)
  if (worker && typeof worker.unref === 'function') {
    worker.unref()
  }
}

function emnapiAddSendListener (worker: any): boolean {
  if (!worker) return false
  if (worker._emnapiSendListener) return true
  const handler = function (e: any): void {
    const data = ENVIRONMENT_IS_NODE ? e : e.data
    const __emnapi__ = data.__emnapi__
    if (__emnapi__ && __emnapi__.type === 'async-send') {
      if (ENVIRONMENT_IS_PTHREAD) {
        const postMessage = napiModule.postMessage!
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

function __emnapi_async_send_js (type: number, callback: number, data: number): void {
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
      case 0: __emnapi_set_immediate(callback, data); break
      case 1: __emnapi_next_tick(callback, data); break
      default: break
    }
  }
}

// function ptrToString (ptr: number): string {
//   return '0x' + ('00000000' + ptr.toString(16)).slice(-8)
// }

function spawnThread (startArg: number, errorOrTid: number): number {
  const isNewABI = errorOrTid !== undefined
  if (!isNewABI) {
    errorOrTid = _malloc($to64('8'))
    if (!errorOrTid) {
      return -48 /* ENOMEM */
    }
  }
  const struct = new Int32Array(wasmMemory.buffer, errorOrTid, 2)
  Atomics.store(struct, 0, 0)
  Atomics.store(struct, 1, 0)

  if (ENVIRONMENT_IS_PTHREAD) {
    const postMessage = napiModule.postMessage!
    postMessage({
      __emnapi__: {
        type: 'spawn-thread',
        payload: {
          startArg,
          errorOrTid
        }
      }
    })
    Atomics.wait(struct, 1, 0)
    const isError = Atomics.load(struct, 0)
    const result = Atomics.load(struct, 1)
    if (isNewABI) {
      return isError
    }
    _free($to64('errorOrTid'))
    return isError ? -result : result
  }

  let worker: any
  try {
    worker = PThread.getNewWorker()
    if (!worker) {
      throw new Error('failed to get new worker')
    }
  } catch (e) {
    const EAGAIN = 6

    Atomics.store(struct, 0, 1)
    Atomics.store(struct, 1, EAGAIN)
    Atomics.notify(struct, 1)

    err(e.message)
    if (isNewABI) {
      return 1
    }
    _free($to64('errorOrTid'))
    return -EAGAIN
  }

  const tid = PThread.nextWorkerID + 43

  Atomics.store(struct, 0, 0)
  Atomics.store(struct, 1, tid)
  Atomics.notify(struct, 1)

  PThread.nextWorkerID = (PThread.nextWorkerID + 1) % (0xffffffff - 42)
  PThread.pthreads[tid] = worker
  worker.__emnapi_tid = tid
  PThread.runningWorkers.push(worker)
  if (ENVIRONMENT_IS_NODE) {
    worker.ref()
  }

  worker.postMessage({
    __emnapi__: {
      type: 'start',
      payload: {
        tid,
        arg: startArg
      }
    }
  })

  if (isNewABI) {
    return 0
  }
  _free($to64('errorOrTid'))
  return tid
}

function startThread (tid: number, startArg: number): void {
  if (napiModule.childThread) {
    if (typeof wasmInstance.exports.wasi_thread_start !== 'function') {
      throw new TypeError('wasi_thread_start is not exported')
    }
    const postMessage = napiModule.postMessage!
    ;(wasmInstance.exports.wasi_thread_start as Function)(tid, startArg)
    postMessage({
      __emnapi__: {
        type: 'cleanup-thread',
        payload: {
          tid
        }
      }
    })
  } else {
    throw new Error('startThread is only available in child threads')
  }
}

napiModule.spawnThread = spawnThread
napiModule.startThread = startThread

var uvThreadpoolReadyResolve: () => void
var uvThreadpoolReady: Promise<void> & { ready: boolean } = new Promise<void>((resolve) => {
  uvThreadpoolReadyResolve = function () {
    uvThreadpoolReady.ready = true
    resolve()
  }
}) as any
uvThreadpoolReady.ready = false

function __emnapi_is_main_browser_thread (): number {
  return (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) ? 1 : 0
}

function __emnapi_after_uvthreadpool_ready (callback: number, q: number, type: number): void {
  if (uvThreadpoolReady.ready) {
    $makeDynCall('vpi', 'callback')($to64('q'), type)
  } else {
    uvThreadpoolReady.then(() => {
      $makeDynCall('vpi', 'callback')($to64('q'), type)
    })
  }
}

function __emnapi_tell_js_uvthreadpool (threads: number, size: number): void {
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

function __emnapi_emit_async_thread_ready (): void {
  if (!ENVIRONMENT_IS_PTHREAD) return
  const postMessage = napiModule.postMessage!
  postMessage({
    __emnapi__: {
      type: 'async-thread-ready',
      payload: {}
    }
  })
}

emnapiImplementInternal('_emnapi_is_main_browser_thread', 'i', __emnapi_is_main_browser_thread)
emnapiImplementInternal('_emnapi_after_uvthreadpool_ready', 'vppi', __emnapi_after_uvthreadpool_ready)
emnapiImplementInternal('_emnapi_tell_js_uvthreadpool', 'vpi', __emnapi_tell_js_uvthreadpool)
emnapiImplementInternal('_emnapi_emit_async_thread_ready', 'v', __emnapi_emit_async_thread_ready)
emnapiImplementInternal('_emnapi_worker_unref', 'vp', __emnapi_worker_unref)
emnapiImplementInternal('_emnapi_async_send_js', 'vipp', __emnapi_async_send_js)
emnapiImplementHelper('$emnapiAddSendListener', undefined, emnapiAddSendListener, undefined, 'addSendListener')
