/* eslint-disable @typescript-eslint/indent */

const emnapiTSFN = {
  queue: Object.create(null) as any,
  init () {
    emnapiTSFN.queue = Object.create(null)
  },
  addListener (worker: any) {
    if (!worker) return false
    if (worker._emnapiTSFNListener) return true
    const handler = function (e: any): void {
      const data = ENVIRONMENT_IS_NODE ? e : e.data
      const __emnapi__ = data.__emnapi__
      if (__emnapi__) {
        const type = __emnapi__.type
        const payload = __emnapi__.payload
        if (type === 'tsfn-push-queue') {
          emnapiTSFN.pushQueue(payload.tsfn, payload.data)
          Atomics.notify(payload.i32a, 0)
        } else if (type === 'tsfn-send') {
          emnapiTSFN.dispatch(payload.tsfn)
        }
      }
    }
    const dispose = function (): void {
      if (ENVIRONMENT_IS_NODE) {
        worker.off('message', handler)
      } else {
        worker.removeEventListener('message', handler, false)
      }
      delete worker._emnapiTSFNListener
    }
    worker._emnapiTSFNListener = { handler, dispose }
    if (ENVIRONMENT_IS_NODE) {
      worker.on('message', handler)
    } else {
      worker.addEventListener('message', handler, false)
    }
    return true
  },
  pushQueue (func: number, data: number): void {
    if (ENVIRONMENT_IS_PTHREAD) {
      const sab = new SharedArrayBuffer(4)
      const i32a = new Int32Array(sab)
      postMessage({
        __emnapi__: {
          type: 'tsfn-push-queue',
          payload: {
            i32a,
            tsfn: func,
            data
          }
        }
      })
      Atomics.wait(i32a, 0, 0)
      return
    }
    emnapiTSFN.queue[func] = emnapiTSFN.queue[func] || []
    emnapiTSFN.queue[func].push(data)
    emnapiTSFN.addQueueSize(func)
  },
  push (func: number, data: number, mode: napi_threadsafe_function_call_mode) {
    const mutex = emnapiTSFN.getMutex(func)
    const cond = emnapiTSFN.getCond(func)
    const waitCondition = (): boolean => {
      const queueSize = emnapiTSFN.getQueueSize(func)
      const maxSize = emnapiTSFN.getMaxQueueSize(func)
      const isClosing = emnapiTSFN.getIsClosing(func)
      return queueSize >= maxSize && maxSize > 0 && !isClosing
    }
    return mutex.execute(() => {
      while (waitCondition()) {
        if (mode === napi_threadsafe_function_call_mode.napi_tsfn_nonblocking) {
          return napi_status.napi_queue_full
        }

        cond.wait()
      }

      if (emnapiTSFN.getIsClosing(func)) {
        if (emnapiTSFN.getThreadCount(func) === 0) {
          return napi_status.napi_invalid_arg
        } else {
          emnapiTSFN.subThreadCount(func)
          return napi_status.napi_closing
        }
      } else {
        emnapiTSFN.pushQueue(func, data)
        emnapiTSFN.send(func)
        return napi_status.napi_ok
      }
    })
  },
  getMutex (func: number) {
    const index = (func + $POINTER_SIZE * 12 + 16) >> 2
    const mutex = {
      lock () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) {
          while (true) {
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 1)
            if (oldValue === 0) {
              return
            }
          }
        } else {
          while (true) {
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 1)
            if (oldValue === 0) {
              return
            }
            Atomics.wait(i32a, 0, 1)
          }
        }
      },
      lockAsync () {
        return new Promise<void>(resolve => {
          const again = (): void => { fn() }
          const fn = (): void => {
            const i32a = new Int32Array(wasmMemory.buffer, index, 1)
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 1)
            if (oldValue === 0) {
              resolve()
              return
            }
            (Atomics as any).waitAsync(i32a, 0, 1).value.then(again)
          }
          fn()
        })
      },
      unlock () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const oldValue = Atomics.compareExchange(i32a, 0, 1, 0)
        if (oldValue !== 1) {
          throw new Error('Tried to unlock while not holding the mutex')
        }
        Atomics.notify(i32a, 0, 1)
      },
      execute<T> (fn: () => T): T {
        mutex.lock()

        try {
          return fn()
        } finally {
          mutex.unlock()
        }
      },
      executeAsync<T> (fn: () => Promise<T>): Promise<T> {
        return mutex.lockAsync().then(() => {
          const r = fn()
          mutex.unlock()
          return r
        }, (err) => {
          mutex.unlock()
          throw err
        })
      }
    }
    return mutex
  },
  getCond (func: number) {
    const index = (func + $POINTER_SIZE * 12 + 20) >> 2
    const mutex = emnapiTSFN.getMutex(func)
    const cond = {
      wait () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        Atomics.wait(i32a, index, value)
        mutex.lock()
      },
      waitAsync () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        const lock = (): Promise<void> => mutex.lockAsync()
        try {
          return (Atomics as any).waitAsync(i32a, index, value).value.then(lock, lock)
        } catch (err) {
          return lock()
        }
      },
      signal () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        Atomics.add(i32a, index, 1)
        Atomics.notify(i32a, index, 1)
      }
    }
    return cond
  },
  getQueueSize (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + $POINTER_SIZE * 3, true)
  },
  addQueueSize (func: number): void {
    let arr: any
// #if MEMORY64
    arr = new Uint32Array(wasmMemory.buffer)
// #else
    arr = new BigUint64Array(wasmMemory.buffer)
// #endif
    Atomics.add(arr, (func + $POINTER_SIZE * 3) >> 2, $to64('1') as any)
  },
  subQueueSize (func: number): void {
    let arr: any
// #if MEMORY64
    arr = new Uint32Array(wasmMemory.buffer)
// #else
    arr = new BigUint64Array(wasmMemory.buffer)
// #endif
    Atomics.sub(arr, (func + $POINTER_SIZE * 3) >> 2, $to64('1') as any)
  },
  getThreadCount (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + $POINTER_SIZE * 4, true)
  },
  addThreadCount (func: number): void {
    let arr: any
// #if MEMORY64
    arr = new Uint32Array(wasmMemory.buffer)
// #else
    arr = new BigUint64Array(wasmMemory.buffer)
// #endif
    Atomics.add(arr, (func + $POINTER_SIZE * 4) >> 2, $to64('1') as any)
  },
  subThreadCount (func: number): void {
    let arr: any
// #if MEMORY64
    arr = new Uint32Array(wasmMemory.buffer)
// #else
    arr = new BigUint64Array(wasmMemory.buffer)
// #endif
    Atomics.sub(arr, (func + $POINTER_SIZE * 4) >> 2, $to64('1') as any)
  },
  getIsClosing (func: number): number {
    return Atomics.load(new Int32Array(wasmMemory.buffer), (func + $POINTER_SIZE * 5) >> 2)
  },
  setIsClosing (func: number, value: 0 | 1): number {
    return Atomics.store(new Int32Array(wasmMemory.buffer), (func + $POINTER_SIZE * 5) >> 2, value)
  },
  getDispatchState (func: number): number {
    return Atomics.load(new Uint32Array(wasmMemory.buffer), (func + $POINTER_SIZE * 5 + 4) >> 2)
  },
  getContext (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + $POINTER_SIZE * 5 + 8, false)
  },
  getMaxQueueSize (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + $POINTER_SIZE * 6 + 8, true)
  },
  loadSizeTypeValue (offset: number, unsigned: boolean): number {
    let ret: any
    let arr: any
    if (unsigned) {
// #if MEMORY64
      arr = new BigUint64Array(wasmMemory.buffer)
      ret = Number(Atomics.load(arr, offset >> 3))
// #else
      arr = new Uint32Array(wasmMemory.buffer)
      ret = Atomics.load(arr, offset >> 2)
// #endif
      return ret
    } else {
// #if MEMORY64
      arr = new BigInt64Array(wasmMemory.buffer)
      ret = Number(Atomics.load(arr, offset >> 3))
// #else
      arr = new Int32Array(wasmMemory.buffer)
      ret = Atomics.load(arr, offset >> 2)
// #endif
      return ret
    }
  },
  storeSizeTypeValue (offset: number, value: number, unsigned: boolean): void {
    let arr: any
    if (unsigned) {
// #if MEMORY64
      arr = new BigUint64Array(wasmMemory.buffer)
      Atomics.store(arr, offset >> 3, BigInt(value) as any)
// #else
      arr = new Uint32Array(wasmMemory.buffer)
      Atomics.store(arr, offset >> 2, value)
// #endif
      return undefined
    } else {
// #if MEMORY64
      arr = new BigInt64Array(wasmMemory.buffer)
      Atomics.store(arr, offset >> 3, BigInt(value >>> 0) as any)
// #else
      arr = new Int32Array(wasmMemory.buffer)
      Atomics.store(arr, offset >> 2, value >>> 0)
// #endif
      return undefined
    }
  },
  cleanup (func: number) {
    emnapiTSFN.closeHandlesAndMaybeDelete(func, 1)
  },
  closeHandlesAndMaybeDelete (func: number, set_closing: number) {
    // TODO
  },
  dispatchOne (func: number): boolean {
    // TODO
    return false
  },
  dispatch (func: number) {
    let has_more = true

    let iterations_left = 1000
    const ui32a = new Uint32Array(wasmMemory.buffer)
    const index = (func + $POINTER_SIZE * 5 + 4) >> 2
    while (has_more && --iterations_left !== 0) {
      Atomics.store(ui32a, index, 1)
      has_more = emnapiTSFN.dispatchOne(func)

      if (Atomics.exchange(ui32a, index, 0) !== 1) {
        has_more = true
      }
    }

    if (has_more) {
      emnapiTSFN.send(func)
    }
  },
  send (func: number): void {
    const current_state = Atomics.or(new Uint32Array(wasmMemory.buffer), (func + $POINTER_SIZE * 5 + 4) >> 2, 1 << 1)
    if ((current_state & 1) === 1) {
      return
    }
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        __emnapi__: {
          type: 'tsfn-send',
          payload: {
            tsfn: func
          }
        }
      })
    } else {
      emnapiCtx.feature.setImmediate(() => {
        emnapiTSFN.dispatch(func)
      })
    }
  }
}

function _napi_create_threadsafe_function (
  env: napi_env,
  func: napi_value,
  async_resource: napi_value,
  async_resource_name: napi_value,
  max_queue_size: size_t,
  initial_thread_count: size_t,
  thread_finalize_data: void_p,
  thread_finalize_cb: napi_finalize,
  context: void_p,
  call_js_cb: number,
  result: number
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, async_resource_name)
  $from64('max_queue_size')
  $from64('initial_thread_count')
  $from64('env')
  $from64('thread_finalize_data')
  $from64('thread_finalize_cb')
  $from64('context')
  $from64('call_js_cb')
  max_queue_size = max_queue_size >>> 0
  initial_thread_count = initial_thread_count >>> 0
  if (max_queue_size === 0) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  $CHECK_ARG!(envObject, result)

  let ref: napi_ref = 0
  $from64('func')
  if (!func) {
    $CHECK_ARG!(envObject, call_js_cb)
  } else {
    const funcValue = emnapiCtx.handleStore.get(func)!.value
    if (typeof funcValue !== 'function') {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ref = emnapiCtx.createReference(envObject, func, 1, Ownership.kUserland as any).id
  }

  let asyncResourceObject: any
  if (async_resource) {
    asyncResourceObject = emnapiCtx.handleStore.get(async_resource)!.value
    if (asyncResourceObject == null) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    asyncResourceObject = Object(asyncResourceObject)
  } else {
    asyncResourceObject = {}
  }
  const resource = envObject.ensureHandleId(asyncResourceObject)

  let asyncResourceName = emnapiCtx.handleStore.get(async_resource_name)!.value
  if (typeof asyncResourceName === 'symbol') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  asyncResourceName = String(asyncResourceName)
  const resource_name = envObject.ensureHandleId(asyncResourceName)

  // tsfn create
  // struct napi_threadsafe_function__ {
  //   napi_ref resource_                            // 0 * PS
  //   double async_id;                              // 1 * PS
  //   double trigger_async_id;                      // 2 * PS
  //   size_t queue_size                             // 3 * PS
  //   size_t thread_count;                          // 4 * PS
  //   bool is_closing;                              // 5 * PS + 0
  //   atomic_uchar dispatch_state;                  // 5 * PS + 4
  //   void* context;                                // 5 * PS + 8
  //   size_t max_queue_size;                        // 6 * PS + 8
  //   napi_ref ref;                                 // 7 * PS + 8
  //   napi_env env;                                 // 8 * PS + 8
  //   void* finalize_data;                          // 9 * PS + 8
  //   napi_finalize finalize_cb;                    // 10 * PS + 8
  //   napi_threadsafe_function_call_js call_js_cb;  // 11 * PS + 8
  //   bool handles_closing;                         // 12 * PS + 8
  //   bool async_ref;                               // 12 * PS + 12
  //   int32_t mutex;                                // 12 * PS + 16
  //   int32_t cond;                                 // 12 * PS + 20
  // }
  const sizeofTSFN = 12 * $POINTER_SIZE + 24
  const tsfn = $makeMalloc('napi_create_threadsafe_function', 'sizeofTSFN')
  if (!tsfn) return envObject.setLastError(napi_status.napi_generic_failure)
  new Uint8Array(wasmMemory.buffer).subarray(tsfn, tsfn + sizeofTSFN).fill(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resource_ = emnapiCtx.createReference(envObject, resource, 1, Ownership.kUserland as any).id
  $makeSetValue('tsfn', 0, 'resource_', '*')
  __emnapi_node_emit_async_init(resource, resource_name, -1, $POINTER_SIZE * 1)
  $makeSetValue('tsfn', '0 + 4 * ' + POINTER_SIZE, 'initial_thread_count', SIZE_TYPE)
  $makeSetValue('tsfn', '8 + 5 * ' + POINTER_SIZE, 'context', '*')
  $makeSetValue('tsfn', '8 + 6 * ' + POINTER_SIZE, 'max_queue_size', SIZE_TYPE)
  $makeSetValue('tsfn', '8 + 7 * ' + POINTER_SIZE, 'ref', '*')
  $makeSetValue('tsfn', '8 + 8 * ' + POINTER_SIZE, 'env', '*')
  $makeSetValue('tsfn', '8 + 9 * ' + POINTER_SIZE, 'thread_finalize_data', '*')
  $makeSetValue('tsfn', '8 + 10 * ' + POINTER_SIZE, 'thread_finalize_cb', '*')
  $makeSetValue('tsfn', '8 + 11 * ' + POINTER_SIZE, 'call_js_cb', '*')
  emnapiCtx.addCleanupHook(envObject, emnapiTSFN.cleanup, tsfn)
  envObject.ref()

  __emnapi_runtime_keepalive_push()
  emnapiCtx.increaseWaitingRequestCounter()
  $makeSetValue('tsfn', '12 + 11 * ' + POINTER_SIZE, '1', 'i32')

  $from64('result')
  $makeSetValue('result', 0, 'tsfn', '*')

  return envObject.clearLastError()
}

function _napi_get_threadsafe_function_context (func: number, result: void_pp): napi_status {
  if (!func || !result) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const context = emnapiTSFN.getContext(func)
  $makeSetValue('result', 0, 'context', '*')
  return napi_status.napi_ok
}

function _napi_call_threadsafe_function (func: number, data: void_p, mode: napi_threadsafe_function_call_mode): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')
  $from64('data')

  return emnapiTSFN.push(func, data, mode)
}

function _napi_acquire_threadsafe_function (func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')

  const mutex = emnapiTSFN.getMutex(func)
  return mutex.execute(() => {
    if (emnapiTSFN.getIsClosing(func)) {
      return napi_status.napi_closing
    }
    emnapiTSFN.addThreadCount(func)
    return napi_status.napi_ok
  })
}

function _napi_release_threadsafe_function (func: number, mode: napi_threadsafe_function_release_mode): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')

  const mutex = emnapiTSFN.getMutex(func)
  const cond = emnapiTSFN.getCond(func)
  return mutex.execute(() => {
    if (emnapiTSFN.getThreadCount(func) === 0) {
      return napi_status.napi_invalid_arg
    }

    emnapiTSFN.subThreadCount(func)

    if (emnapiTSFN.getThreadCount(func) === 0 || mode === napi_threadsafe_function_release_mode.napi_tsfn_abort) {
      const isClosing = emnapiTSFN.getIsClosing(func)
      if (!isClosing) {
        const isClosingValue = (mode === napi_threadsafe_function_release_mode.napi_tsfn_abort) ? 1 : 0
        emnapiTSFN.setIsClosing(func, isClosingValue)
        if (isClosingValue && emnapiTSFN.getMaxQueueSize(func) > 0) {
          cond.signal()
        }

        emnapiTSFN.send(func)
      }
    }

    return napi_status.napi_ok
  })
}

function _napi_unref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')
  const asyncRefOffset = (func + $POINTER_SIZE * 12 + 12) >> 2
  const arr = new Int32Array(wasmMemory.buffer)
  if (Atomics.load(arr, asyncRefOffset)) {
    Atomics.store(arr, asyncRefOffset, 0)
    __emnapi_runtime_keepalive_pop()
    emnapiCtx.decreaseWaitingRequestCounter()
  }
  return napi_status.napi_ok
}

function _napi_ref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  $from64('func')
  const asyncRefOffset = (func + $POINTER_SIZE * 12 + 12) >> 2
  const arr = new Int32Array(wasmMemory.buffer)
  if (!Atomics.load(arr, asyncRefOffset)) {
    Atomics.store(arr, asyncRefOffset, 1)
    __emnapi_runtime_keepalive_push()
    emnapiCtx.increaseWaitingRequestCounter()
  }
  return napi_status.napi_ok
}

emnapiDefineVar('$emnapiTSFN', emnapiTSFN, [],
  'emnapiTSFN.init();' +
  'if (typeof PThread !== "undefined") {' +
    'PThread.unusedWorkers.forEach(emnapiTSFN.addListener);' +
    'PThread.runningWorkers.forEach(emnapiTSFN.addListener);' +
    '(function () { var __original_getNewWorker = PThread.getNewWorker; PThread.getNewWorker = function () {' +
      'var r = __original_getNewWorker.apply(this, arguments);' +
      'emnapiTSFN.addListener(r);' +
      'return r;' +
    '}; })();' +
  '}'
)

emnapiImplement('napi_create_threadsafe_function', 'ippppppppppp', _napi_create_threadsafe_function, [
  '$emnapiTSFN',
  '_emnapi_node_emit_async_init',
  '_emnapi_runtime_keepalive_push'
])
emnapiImplement('napi_get_threadsafe_function_context', 'ipp', _napi_get_threadsafe_function_context, ['$emnapiTSFN'])
emnapiImplement('napi_call_threadsafe_function', 'ippi', _napi_call_threadsafe_function, ['$emnapiTSFN'])
emnapiImplement('napi_acquire_threadsafe_function', 'ip', _napi_acquire_threadsafe_function, ['$emnapiTSFN'])
emnapiImplement('napi_release_threadsafe_function', 'ipi', _napi_release_threadsafe_function, ['$emnapiTSFN'])
emnapiImplement('napi_unref_threadsafe_function', 'ipp', _napi_unref_threadsafe_function, ['$emnapiTSFN', '_emnapi_runtime_keepalive_pop'])
emnapiImplement('napi_ref_threadsafe_function', 'ipp', _napi_ref_threadsafe_function, ['$emnapiTSFN', '_emnapi_runtime_keepalive_push'])
