/* eslint-disable @typescript-eslint/restrict-plus-operands */
// declare const PThread: any

function __emnapi_worker_unref (pthreadPtr: number): void {
  if (ENVIRONMENT_IS_PTHREAD) return
  const view = new DataView(wasmMemory.buffer)
  const tidOffset = 20 // wasi-sdk-20.0+threads
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

let nextTid = 43
function spawnThread (startArg: number, errorOrTid: number, threadId?: Int32Array): number {
  errorOrTid = errorOrTid || 0
  if (ENVIRONMENT_IS_PTHREAD) {
    const threadIdBuffer = new SharedArrayBuffer(8)
    const id = new Int32Array(threadIdBuffer)
    const postMessage = napiModule.postMessage!
    postMessage({
      __emnapi__: {
        type: 'spawn-thread',
        payload: {
          startArg,
          errorOrTid,
          threadId: id
        }
      }
    })
    Atomics.wait(id, 1, 0)
    if (errorOrTid) {
      const HEAPU32 = new Uint32Array(wasmMemory.buffer, errorOrTid, 2)
      const isError = Atomics.load(id, 0)
      const result = Atomics.load(id, 1)
      Atomics.store(HEAPU32, 0, isError)
      Atomics.store(HEAPU32, 1, result < 0 ? -result : result)
      return isError
    }
    return Atomics.load(id, 1)
  }

  let worker: any
  try {
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('createNapiModule `options.onCreateWorker` is not provided')
    }
    worker = onCreateWorker()
  } catch (err) {
    const EAGAIN = 6
    const ret = -EAGAIN
    if (threadId) {
      Atomics.store(threadId, 0, 1)
      Atomics.store(threadId, 1, ret)
      Atomics.notify(threadId, 1)
    }
    err(err.message)
    if (errorOrTid) {
      const HEAPU32 = new Uint32Array(wasmMemory.buffer, errorOrTid, 2)
      Atomics.store(HEAPU32, 0, 1)
      Atomics.store(HEAPU32, 1, EAGAIN)
      return 1
    }
    return ret
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
        spawnThread(payload.startArg, payload.errorOrTid, payload.threadId)
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
  const tid = nextTid
  nextTid++
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
  if (threadId) {
    Atomics.store(threadId, 0, 0)
    Atomics.store(threadId, 1, tid)
    Atomics.notify(threadId, 1)
  }
  worker.postMessage(msg)
  if (errorOrTid) {
    const HEAPU32 = new Uint32Array(wasmMemory.buffer, errorOrTid, 2)
    Atomics.store(HEAPU32, 0, 0)
    Atomics.store(HEAPU32, 1, tid)
    return 0
  }
  return tid
}
napiModule.spawnThread = spawnThread

function _pthread_atfork (): number {
  return 0
}

emnapiImplementInternal('pthread_atfork', 'ippp', _pthread_atfork)
emnapiImplementInternal('_emnapi_worker_unref', 'vp', __emnapi_worker_unref)
emnapiImplementInternal('_emnapi_async_send_js', 'vipp', __emnapi_async_send_js)
emnapiImplementHelper('$emnapiAddSendListener', undefined, emnapiAddSendListener, undefined, 'addSendListener')
