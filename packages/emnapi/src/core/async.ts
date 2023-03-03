/* eslint-disable @typescript-eslint/restrict-plus-operands */
// declare const PThread: any

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
  const worker = napiModule.pthreads[tid]
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

let tidCount = 0
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
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('createNapiModule `options.onCreateWorker` is not provided')
    }
    worker = onCreateWorker()
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

  worker.onmessage = function (e: any) {
    if (e.data.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload
      if (type === 'loaded') {
        if (payload.err) {
          err('failed to load in child thread: ' + (payload.err.message || payload.err))
        }
      } else if (type === 'spawn-thread') {
        spawnThread(payload.startArg, payload.errorOrTid)
      } else if (type === 'cleanup-thread') {
        delete napiModule.pthreads[payload.tid]
        worker.terminate()
      }
    }
  }
  worker.onerror = (e: any) => {
    const message = 'worker sent an error!'
    // if (worker.pthread_ptr) {
    //   message = 'Pthread ' + ptrToString(worker.pthread_ptr) + ' sent an error!'
    // }
    err(message + ' ' + e.message)
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
  const tid = tidCount + 43
  tidCount = (tidCount + 1) % (0xffffffff - 42)
  napiModule.pthreads[tid] = worker
  // worker.pthread_ptr = tid
  const msg = {
    __emnapi__: {
      type: 'load',
      payload: {
        wasmModule,
        wasmMemory,
        tid,
        arg: startArg
      }
    }
  }

  Atomics.store(struct, 0, 0)
  Atomics.store(struct, 1, tid)
  Atomics.notify(struct, 1)
  worker.postMessage(msg)
  if (isNewABI) {
    return 0
  }
  _free($to64('errorOrTid'))
  return tid
}
napiModule.spawnThread = spawnThread

emnapiImplementInternal('_emnapi_worker_unref', 'vp', __emnapi_worker_unref)
emnapiImplementInternal('_emnapi_async_send_js', 'vipp', __emnapi_async_send_js)
emnapiImplementHelper('$emnapiAddSendListener', undefined, emnapiAddSendListener, undefined, 'addSendListener')
