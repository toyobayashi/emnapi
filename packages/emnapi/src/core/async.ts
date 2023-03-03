/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/restrict-plus-operands */

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
      worker.postMessage({
        __emnapi__: {
          type: 'load',
          payload: {
            wasmModule,
            wasmMemory
          }
        }
      })
    })
    return worker.whenLoaded
  },
  allocateUnusedWorker () {
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('createNapiModule `options.onCreateWorker` is not provided')
    }
    const worker = onCreateWorker()
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

function __emnapi_worker_unref (pthreadPtr: number): void {
  if (ENVIRONMENT_IS_PTHREAD) return
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
    errorOrTid = $makeMalloc('spawnThread', '8')
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
  } catch (err) {
    const EAGAIN = 6

    Atomics.store(struct, 0, 1)
    Atomics.store(struct, 1, EAGAIN)
    Atomics.notify(struct, 1)

    err(err.message)
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

  const startMsg = {
    __emnapi__: {
      type: 'start',
      payload: {
        tid,
        arg: startArg
      }
    }
  }

  if (worker.loaded) {
    worker.postMessage(startMsg)
  } else {
    worker.whenLoaded.then(() => {
      worker.postMessage(startMsg)
    })
  }
  if (isNewABI) {
    return 0
  }
  _free($to64('errorOrTid'))
  return tid
}

function startThread (tid: number, startArg: number): void {
  if (napiModule.childThread) {
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

emnapiImplementInternal('_emnapi_worker_unref', 'vp', __emnapi_worker_unref)
emnapiImplementInternal('_emnapi_async_send_js', 'vipp', __emnapi_async_send_js)
emnapiImplementHelper('$emnapiAddSendListener', undefined, emnapiAddSendListener, undefined, 'addSendListener')
