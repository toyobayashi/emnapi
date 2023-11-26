import { emnapiTSFN } from '../threadsafe-function'
import { err, ENVIRONMENT_IS_NODE, reuseWorker, wasmModule, wasmMemory, onCreateWorker, ENVIRONMENT_IS_PTHREAD, _free, _malloc, napiModule, wasmInstance } from './init'

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

napiModule.emnapi.addSendListener = emnapiAddSendListener

function terminateWorker (worker: any): void {
  const tid = worker.__emnapi_tid
  worker.terminate()
  worker.onmessage = (e: any) => {
    if (e.data.__emnapi__) {
      err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid)
    }
  }
}

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

  const WASI_THREADS_MAX_TID = 0x1FFFFFFF
  PThread.nextWorkerID = (PThread.nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42)
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

export var PThread = {
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
    const worker = onCreateWorker({ type: 'thread' })
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
