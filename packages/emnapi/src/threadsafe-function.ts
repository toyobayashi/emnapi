/* eslint-disable @stylistic/indent */

import { emnapiEnv } from 'emnapi:shared'
import { ENVIRONMENT_IS_NODE, _malloc, wasmMemory, _free, ENVIRONMENT_IS_PTHREAD, abort, PThread } from 'emscripten:runtime'
import { POINTER_SIZE, to64, makeDynCall, from64, makeSetValue, SIZE_TYPE } from 'emscripten:parse-tools'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG } from './macro'

declare var emnapiCtx: Context
declare var emnapiNodeBinding: NodeBinding | undefined
declare function __emnapi_node_emit_async_destroy (async_id: double, trigger_async_id: double): void
declare function __emnapi_node_emit_async_init (
  async_resource: napi_value,
  async_resource_name: napi_value,
  trigger_async_id: double,
  result: Pointer<[double, double]>
): void
declare function __emnapi_runtime_keepalive_pop (): void
declare function __emnapi_runtime_keepalive_push (): void

const enum State {
  kOpen,
  kClosing,
  kClosed,
}

/**
 * @__deps malloc
 * @__deps free
 * @__deps $emnapiCtx
 * @__deps $emnapiEnv
 * @__deps $emnapiNodeBinding
 * @__deps _emnapi_node_emit_async_destroy
 * @__deps _emnapi_runtime_keepalive_pop
 * @__postset
 * ```
 * emnapiTSFN.init();
 * ```
 */
const emnapiTSFN = {
  offset: {
    __size__: 0,
    /* napi_ref */ resource: 0,
    /* double */ async_id: 0,
    /* double */ trigger_async_id: 0,
    /* size_t */ queue_size: 0,
    /* bool */ is_some: 0,
    /* void* */ queue: 0,
    /* size_t */ thread_count: 0,
    /* int32_t */ state: 0,
    /* atomic_uchar */ dispatch_state: 0,
    /* void* */ context: 0,
    /* size_t */ max_queue_size: 0,
    /* napi_ref */ ref: 0,
    /* napi_env */ env: 0,
    /* void* */ finalize_data: 0,
    /* napi_finalize */ finalize_cb: 0,
    /* napi_threadsafe_function_call_js */ call_js_cb: 0,
    /* bool */ handles_closing: 0,
    /* bool */ async_ref: 0,
    /* int32_t */ mutex: 0,
    /* int32_t */ cond: 0,
  },
  init () {
// #if MEMORY64
    emnapiTSFN.offset.__size__ = NapiTSFNOffset64.__size__
    emnapiTSFN.offset.resource = NapiTSFNOffset64.async_resource_resource
    emnapiTSFN.offset.async_id = NapiTSFNOffset64.async_resource_async_context_async_id
    emnapiTSFN.offset.trigger_async_id = NapiTSFNOffset64.async_resource_async_context_trigger_async_id
    emnapiTSFN.offset.queue_size = NapiTSFNOffset64.queue_size
    emnapiTSFN.offset.is_some = NapiTSFNOffset64.async_resource_is_some
    emnapiTSFN.offset.queue = NapiTSFNOffset64.queue
    emnapiTSFN.offset.thread_count = NapiTSFNOffset64.thread_count
    emnapiTSFN.offset.state = NapiTSFNOffset64.state
    emnapiTSFN.offset.dispatch_state = NapiTSFNOffset64.dispatch_state
    emnapiTSFN.offset.context = NapiTSFNOffset64.context
    emnapiTSFN.offset.max_queue_size = NapiTSFNOffset64.max_queue_size
    emnapiTSFN.offset.ref = NapiTSFNOffset64.ref
    emnapiTSFN.offset.env = NapiTSFNOffset64.env
    emnapiTSFN.offset.finalize_data = NapiTSFNOffset64.finalize_data
    emnapiTSFN.offset.finalize_cb = NapiTSFNOffset64.finalize_cb
    emnapiTSFN.offset.call_js_cb = NapiTSFNOffset64.call_js_cb
    emnapiTSFN.offset.handles_closing = NapiTSFNOffset64.handles_closing
    emnapiTSFN.offset.async_ref = NapiTSFNOffset64.async_ref
    emnapiTSFN.offset.mutex = NapiTSFNOffset64.mutex
    emnapiTSFN.offset.cond = NapiTSFNOffset64.cond
// #else
    emnapiTSFN.offset.__size__ = NapiTSFNOffset32.__size__
    emnapiTSFN.offset.resource = NapiTSFNOffset32.async_resource_resource
    emnapiTSFN.offset.async_id = NapiTSFNOffset32.async_resource_async_context_async_id
    emnapiTSFN.offset.trigger_async_id = NapiTSFNOffset32.async_resource_async_context_trigger_async_id
    emnapiTSFN.offset.queue_size = NapiTSFNOffset32.queue_size
    emnapiTSFN.offset.is_some = NapiTSFNOffset32.async_resource_is_some
    emnapiTSFN.offset.queue = NapiTSFNOffset32.queue
    emnapiTSFN.offset.thread_count = NapiTSFNOffset32.thread_count
    emnapiTSFN.offset.state = NapiTSFNOffset32.state
    emnapiTSFN.offset.dispatch_state = NapiTSFNOffset32.dispatch_state
    emnapiTSFN.offset.context = NapiTSFNOffset32.context
    emnapiTSFN.offset.max_queue_size = NapiTSFNOffset32.max_queue_size
    emnapiTSFN.offset.ref = NapiTSFNOffset32.ref
    emnapiTSFN.offset.env = NapiTSFNOffset32.env
    emnapiTSFN.offset.finalize_data = NapiTSFNOffset32.finalize_data
    emnapiTSFN.offset.finalize_cb = NapiTSFNOffset32.finalize_cb
    emnapiTSFN.offset.call_js_cb = NapiTSFNOffset32.call_js_cb
    emnapiTSFN.offset.handles_closing = NapiTSFNOffset32.handles_closing
    emnapiTSFN.offset.async_ref = NapiTSFNOffset32.async_ref
    emnapiTSFN.offset.mutex = NapiTSFNOffset32.mutex
    emnapiTSFN.offset.cond = NapiTSFNOffset32.cond
// #endif
    emnapiTSFN.offset.mutex = emnapiTSFN.offset.mutex + 4
    if (typeof PThread !== 'undefined') {
      PThread.unusedWorkers.forEach(emnapiTSFN.addListener)
      PThread.runningWorkers.forEach(emnapiTSFN.addListener)
      const __original_getNewWorker = PThread.getNewWorker
      PThread.getNewWorker = function () {
        const r = __original_getNewWorker.apply(this, arguments as any)
        emnapiTSFN.addListener(r)
        return r
      }
    }
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
        if (type === 'tsfn-send') {
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
  initQueue (func: number): boolean {
    const size = 2 * POINTER_SIZE
    let queue = _malloc(to64('size'))
    if (!queue) return false
    from64('queue')
    new Uint8Array(wasmMemory.buffer, queue as number, size).fill(0)
    emnapiTSFN.storeSizeTypeValue(func + emnapiTSFN.offset.queue, queue as number, false)
    return true
  },
  destroyQueue (func: number) {
    const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false)
    if (queue) {
      _free(to64('queue') as number)
    }
  },
  pushQueue (func: number, data: number): void {
    const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false)
    const head = emnapiTSFN.loadSizeTypeValue(queue, false)
    const tail = emnapiTSFN.loadSizeTypeValue(queue + POINTER_SIZE, false)

    const size = 2 * POINTER_SIZE
    let node = _malloc(to64('size'))
    if (!node) throw new Error('OOM')
    from64('node')
    emnapiTSFN.storeSizeTypeValue(node as number, data, false)
    emnapiTSFN.storeSizeTypeValue(node as number + POINTER_SIZE, 0, false)
    if (head === 0 && tail === 0) {
      emnapiTSFN.storeSizeTypeValue(queue, node as number, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, node as number, false)
    } else {
      emnapiTSFN.storeSizeTypeValue(tail + POINTER_SIZE, node as number, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, node as number, false)
    }
    emnapiTSFN.addQueueSize(func)
  },
  shiftQueue (func: number): number {
    const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false)
    const head = emnapiTSFN.loadSizeTypeValue(queue, false)
    if (head === 0) return 0
    const node = head
    const next = emnapiTSFN.loadSizeTypeValue(head + POINTER_SIZE, false)
    emnapiTSFN.storeSizeTypeValue(queue, next, false)
    if (next === 0) {
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, 0, false)
    }
    emnapiTSFN.storeSizeTypeValue(node + POINTER_SIZE, 0, false)
    const value = emnapiTSFN.loadSizeTypeValue(node, false)
    _free(to64('node') as number)
    emnapiTSFN.subQueueSize(func)
    return value
  },
  push (func: number, data: number, mode: napi_threadsafe_function_call_mode) {
    const mutex = emnapiTSFN.getMutex(func)
    const cond = emnapiTSFN.getCond(func)
    const waitCondition = (): boolean => {
      const queueSize = emnapiTSFN.getQueueSize(func)
      const maxSize = emnapiTSFN.getMaxQueueSize(func)
      return queueSize >= maxSize && maxSize > 0 && emnapiTSFN.getState(func) === State.kOpen
    }
    const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE
    let shouldDelete = false
    const ret = mutex.execute(() => {
      while (waitCondition()) {
        if (mode === napi_threadsafe_function_call_mode.napi_tsfn_nonblocking) {
          return napi_status.napi_queue_full
        }

        /**
         * Browser JS main thread can not use `Atomics.wait`
         *
         * Related:
         * https://github.com/nodejs/node/pull/32689
         * https://github.com/nodejs/node/pull/33453
         */
        if (isBrowserMain) {
          return napi_status.napi_would_deadlock
        }
        cond.wait()
      }

      if (emnapiTSFN.getState(func) === State.kOpen) {
        emnapiTSFN.pushQueue(func, data)
        emnapiTSFN.send(func)
        return napi_status.napi_ok
      }

      if (emnapiTSFN.getThreadCount(func) === 0) {
        return napi_status.napi_invalid_arg
      }
      emnapiTSFN.subThreadCount(func)
      if (!(emnapiTSFN.getState(func) === State.kClosed && emnapiTSFN.getThreadCount(func) === 0)) {
        return napi_status.napi_closing
      }
      shouldDelete = true
      return napi_status.napi_closing
    })
    if (shouldDelete) {
      emnapiTSFN.destroy(func)
    }
    return ret
  },
  getMutex (func: number) {
    const index = func + emnapiTSFN.offset.mutex
    const mutex = {
      lock () {
        const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        if (isBrowserMain) {
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
      /* lockAsync () {
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
      }, */
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
      }/* ,
      executeAsync<T> (fn: () => Promise<T>): Promise<T> {
        return mutex.lockAsync().then(() => {
          const r = fn()
          mutex.unlock()
          return r
        }, (err) => {
          mutex.unlock()
          throw err
        })
      } */
    }
    return mutex
  },
  getCond (func: number) {
    const index = func + emnapiTSFN.offset.cond
    const mutex = emnapiTSFN.getMutex(func)
    const cond = {
      wait () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        Atomics.wait(i32a, 0, value)
        mutex.lock()
      },
      /* waitAsync () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        const lock = (): Promise<void> => mutex.lockAsync()
        try {
          return (Atomics as any).waitAsync(i32a, 0, value).value.then(lock, lock)
        } catch (err) {
          return lock()
        }
      }, */
      signal () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        Atomics.add(i32a, 0, 1)
        Atomics.notify(i32a, 0, 1)
      }
    }
    return cond
  },
  getQueueSize (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue_size, true)
  },
  addQueueSize (func: number): void {
    const offset = emnapiTSFN.offset.queue_size
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(wasmMemory.buffer)
    index = (func + offset) >> 3
// #else
    arr = new Uint32Array(wasmMemory.buffer)
    index = (func + offset) >> 2
// #endif
    Atomics.add(arr, index, to64('1') as any)
  },
  subQueueSize (func: number): void {
    const offset = emnapiTSFN.offset.queue_size
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(wasmMemory.buffer)
    index = (func + offset) >> 3
// #else
    arr = new Uint32Array(wasmMemory.buffer)
    index = (func + offset) >> 2
// #endif
    Atomics.sub(arr, index, to64('1') as any)
  },
  getThreadCount (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.thread_count, true)
  },
  addThreadCount (func: number): void {
    const offset = emnapiTSFN.offset.thread_count
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(wasmMemory.buffer)
    index = (func + offset) >> 3
// #else
    arr = new Uint32Array(wasmMemory.buffer)
    index = (func + offset) >> 2
// #endif
    Atomics.add(arr, index, to64('1') as any)
  },
  subThreadCount (func: number): void {
    const offset = emnapiTSFN.offset.thread_count
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(wasmMemory.buffer)
    index = (func + offset) >> 3
// #else
    arr = new Uint32Array(wasmMemory.buffer)
    index = (func + offset) >> 2
// #endif
    Atomics.sub(arr, index, to64('1') as any)
  },
  getState (func: number): number {
    return Atomics.load(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.state) >> 2)
  },
  setState (func: number, value: 0 | 1 | 2): void {
    Atomics.store(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.state) >> 2, value)
  },
  getHandlesClosing (func: number): number {
    return Atomics.load(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.handles_closing) >> 2)
  },
  setHandlesClosing (func: number, value: 0 | 1): void {
    Atomics.store(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.handles_closing) >> 2, value)
  },
  getDispatchState (func: number): number {
    return Atomics.load(new Uint32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.dispatch_state) >> 2)
  },
  getContext (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.context, false)
  },
  getMaxQueueSize (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.max_queue_size, true)
  },
  getEnv (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.env, false)
  },
  getCallJSCb (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.call_js_cb, false)
  },
  getRef (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.ref, false)
  },
  getResource (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.resource, false)
  },
  getFinalizeCb (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_cb, false)
  },
  getFinalizeData (func: number): number {
    return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_data, false)
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
  releaseResources (func: number) {
    if (emnapiTSFN.getState(func) !== State.kClosed) {
      emnapiTSFN.setState(func, State.kClosed)

      const env = emnapiTSFN.getEnv(func)
      const envObject = emnapiEnv
      const ref = emnapiTSFN.getRef(func)
      if (ref) {
        emnapiCtx.getRef(ref)!.dispose()
      }
      emnapiCtx.removeCleanupHook(envObject, emnapiTSFN.cleanup, func)
      envObject.unref()

      const asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2
      const arr = new Int32Array(wasmMemory.buffer)
      if (Atomics.load(arr, asyncRefOffset)) {
        Atomics.store(arr, asyncRefOffset, 0)
        __emnapi_runtime_keepalive_pop()
        emnapiCtx.decreaseWaitingRequestCounter()
      }

      const resource = emnapiTSFN.getResource(func)
      emnapiCtx.getRef(resource)!.dispose()
      makeSetValue('func', 'emnapiTSFN.offset.is_some', '0', 'i32')

      if (emnapiNodeBinding) {
        const view = new DataView(wasmMemory.buffer)
        const asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true)
        const triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true)
        __emnapi_node_emit_async_destroy(asyncId, triggerAsyncId)
      }
    }
  },
  destroy (func: number) {
    emnapiTSFN.destroyQueue(func)
    emnapiTSFN.releaseResources(func)
    _free(to64('func') as number)
  },
  emptyQueueAndMaybeDelete (func: number) {
    const drainQueue: number[] = []
    emnapiTSFN.getMutex(func).execute(() => {
      while (emnapiTSFN.getQueueSize(func) > 0) {
        drainQueue.push(emnapiTSFN.shiftQueue(func))
      }
    })
    const callJsCb = emnapiTSFN.getCallJSCb(func)

    const context = emnapiTSFN.getContext(func)
    let data: number
    for (let i = 0; i < drainQueue.length; i++) {
      data = drainQueue[i]
      if (callJsCb) {
        makeDynCall('vpppp', 'callJsCb')(to64('0'), to64('0'), to64('context'), to64('data'))
      }
    }
    let shouldDelete = false
    emnapiTSFN.getMutex(func).execute(() => {
      if (emnapiTSFN.getThreadCount(func) > 0) {
        emnapiTSFN.releaseResources(func)
      } else {
        shouldDelete = true
      }
    })
    if (shouldDelete) {
      emnapiTSFN.destroy(func)
    }
  },
  finalize (func: number) {
    const env = emnapiTSFN.getEnv(func)
    const envObject = emnapiEnv
    emnapiCtx.openScope(envObject)

    const finalize = emnapiTSFN.getFinalizeCb(func)

    const data = emnapiTSFN.getFinalizeData(func)

    const context = emnapiTSFN.getContext(func)

    const f = (): void => {
      (envObject as NodeEnv).callFinalizerInternal(
        0,
        to64('finalize') as number,
        to64('data') as number,
        to64('context') as number
      )
    }

    try {
      if (finalize) {
        if (emnapiNodeBinding) {
          const resource = emnapiTSFN.getResource(func)
          const resource_value = emnapiCtx.getRef(resource)!.get()
          const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value)!
          const view = new DataView(wasmMemory.buffer)
          const asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true)
          const triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true)
          emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
            asyncId,
            triggerAsyncId
          })
        } else {
          f()
        }
      }
      emnapiTSFN.emptyQueueAndMaybeDelete(func)
    } finally {
      emnapiCtx.closeScope(envObject)
    }
  },
  cleanup (func: number) {
    emnapiTSFN.closeHandlesAndMaybeDelete(func, 1)
  },
  closeHandlesAndMaybeDelete (func: number, set_closing: number) {
    const env = emnapiTSFN.getEnv(func)
    const envObject = emnapiEnv
    emnapiCtx.openScope(envObject)
    try {
      if (set_closing) {
        emnapiTSFN.getMutex(func).execute(() => {
          emnapiTSFN.setState(func, State.kClosing)
          if (emnapiTSFN.getMaxQueueSize(func) > 0) {
            emnapiTSFN.getCond(func).signal()
          }
        })
      }
      if (emnapiTSFN.getHandlesClosing(func)) {
        return
      }
      emnapiTSFN.setHandlesClosing(func, 1)
      emnapiCtx.features.setImmediate(() => {
        emnapiTSFN.finalize(func)
      })
    } finally {
      emnapiCtx.closeScope(envObject)
    }
  },
  dispatchOne (func: number): boolean {
    let data = 0
    let popped_value = false
    let has_more = false

    const mutex = emnapiTSFN.getMutex(func)
    const cond = emnapiTSFN.getCond(func)
    mutex.execute(() => {
      if (emnapiTSFN.getState(func) === State.kOpen) {
        let size = emnapiTSFN.getQueueSize(func)
        if (size > 0) {
          data = emnapiTSFN.shiftQueue(func)
          popped_value = true
          const maxQueueSize = emnapiTSFN.getMaxQueueSize(func)
          if (size === maxQueueSize && maxQueueSize > 0) {
            cond.signal()
          }
          size--
        }
        if (size === 0) {
          if (emnapiTSFN.getThreadCount(func) === 0) {
            emnapiTSFN.setState(func, State.kClosing)
            if (emnapiTSFN.getMaxQueueSize(func) > 0) {
              cond.signal()
            }
            emnapiTSFN.closeHandlesAndMaybeDelete(func, 0)
          }
        } else {
          has_more = true
        }
      } else {
        emnapiTSFN.closeHandlesAndMaybeDelete(func, 0)
      }
    })

    if (popped_value) {
      const env = emnapiTSFN.getEnv(func)
      const envObject = emnapiEnv
      emnapiCtx.openScope(envObject)

      const f = (): void => {
        (envObject as NodeEnv).callbackIntoModule(false, () => {
          const callJsCb = emnapiTSFN.getCallJSCb(func)
          const ref = emnapiTSFN.getRef(func)
          const js_callback = ref ? emnapiCtx.getRef(ref)!.get() : 0
          if (callJsCb) {
            const context = emnapiTSFN.getContext(func)
            makeDynCall('vpppp', 'callJsCb')(to64('env'), to64('js_callback'), to64('context'), to64('data'))
          } else {
            const jsCallback = js_callback ? emnapiCtx.jsValueFromNapiValue(js_callback)! : null
            if (typeof jsCallback === 'function') {
              jsCallback()
            }
          }
        })
      }

      try {
        if (emnapiNodeBinding) {
          const resource = emnapiTSFN.getResource(func)
          const resource_value = emnapiCtx.getRef(resource)!.get()
          const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value)!
          const view = new DataView(wasmMemory.buffer)
          emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
            asyncId: view.getFloat64(func + emnapiTSFN.offset.async_id, true),
            triggerAsyncId: view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true)
          })
        } else {
          f()
        }
      } finally {
        emnapiCtx.closeScope(envObject)
      }
    }

    return has_more
  },
  dispatch (func: number) {
    let has_more = true

    let iterations_left = 1000
    const ui32a = new Uint32Array(wasmMemory.buffer)
    const index = (func + emnapiTSFN.offset.dispatch_state) >> 2
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
    const current_state = Atomics.or(new Uint32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.dispatch_state) >> 2, 1 << 1)
    if ((current_state & 1) === 1) {
      return
    }
    if ((typeof ENVIRONMENT_IS_PTHREAD !== 'undefined') && ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        __emnapi__: {
          type: 'tsfn-send',
          payload: {
            tsfn: func
          }
        }
      })
    } else {
      emnapiCtx.features.setImmediate(() => {
        emnapiTSFN.dispatch(func)
      })
    }
  }
}

emnapiTSFN.init()

/**
 * @__deps _emnapi_node_emit_async_init
 * @__deps _emnapi_runtime_keepalive_push
 * @__sig ippppppppppp
 */
export function napi_create_threadsafe_function (
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
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, async_resource_name)
  from64('max_queue_size')
  from64('initial_thread_count')
  from64('env')
  from64('thread_finalize_data')
  from64('thread_finalize_cb')
  from64('context')
  from64('call_js_cb')
  max_queue_size = max_queue_size >>> 0
  initial_thread_count = initial_thread_count >>> 0
  if (initial_thread_count === 0) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  $CHECK_ARG!(envObject, result)

  let ref: napi_ref = 0
  from64('func')
  if (!func) {
    $CHECK_ARG!(envObject, call_js_cb)
  } else {
    const funcValue = emnapiCtx.jsValueFromNapiValue(func)!
    if (typeof funcValue !== 'function') {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    ref = emnapiCtx.createReference(envObject, func, 1, ReferenceOwnership.kUserland as any).id
  }

  let asyncResourceObject: any
  if (async_resource) {
    asyncResourceObject = emnapiCtx.jsValueFromNapiValue(async_resource)!
    if (asyncResourceObject == null) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    asyncResourceObject = Object(asyncResourceObject)
  } else {
    asyncResourceObject = {}
  }
  const resource = emnapiCtx.napiValueFromJsValue(asyncResourceObject)

  let asyncResourceName = emnapiCtx.jsValueFromNapiValue(async_resource_name)!
  if (typeof asyncResourceName === 'symbol') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  asyncResourceName = String(asyncResourceName)
  const resource_name = emnapiCtx.napiValueFromJsValue(asyncResourceName)

  // tsfn create
  const sizeofTSFN = emnapiTSFN.offset.__size__
  let tsfn = _malloc(to64('sizeofTSFN'))
  if (!tsfn) return envObject.setLastError(napi_status.napi_generic_failure)
  from64('tsfn')
  new Uint8Array(wasmMemory.buffer).subarray(tsfn as number, tsfn as number + sizeofTSFN).fill(0)
  const resourceRef = emnapiCtx.createReference(envObject, resource, 1, ReferenceOwnership.kUserland as any)

  const resource_ = resourceRef.id
  makeSetValue('tsfn', 'emnapiTSFN.offset.resource', 'resource_', '*')
  if (!emnapiTSFN.initQueue(tsfn as number)) {
    _free(to64('tsfn') as number)
    resourceRef.dispose()
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  __emnapi_node_emit_async_init(resource, resource_name, -1, tsfn as number + emnapiTSFN.offset.async_id)
  makeSetValue('tsfn', 'emnapiTSFN.offset.is_some', '1', 'i32')
  makeSetValue('tsfn', 'emnapiTSFN.offset.thread_count', 'initial_thread_count', SIZE_TYPE)
  makeSetValue('tsfn', 'emnapiTSFN.offset.context', 'context', '*')
  makeSetValue('tsfn', 'emnapiTSFN.offset.max_queue_size', 'max_queue_size', SIZE_TYPE)
  makeSetValue('tsfn', 'emnapiTSFN.offset.ref', 'ref', '*')
  makeSetValue('tsfn', 'emnapiTSFN.offset.env', 'env', '*')
  makeSetValue('tsfn', 'emnapiTSFN.offset.finalize_data', 'thread_finalize_data', '*')
  makeSetValue('tsfn', 'emnapiTSFN.offset.finalize_cb', 'thread_finalize_cb', '*')
  makeSetValue('tsfn', 'emnapiTSFN.offset.call_js_cb', 'call_js_cb', '*')
  emnapiCtx.addCleanupHook(envObject, emnapiTSFN.cleanup, tsfn as number)
  envObject.ref()

  __emnapi_runtime_keepalive_push()
  emnapiCtx.increaseWaitingRequestCounter()
  makeSetValue('tsfn', 'emnapiTSFN.offset.async_ref', '1', 'i32')

  from64('result')
  makeSetValue('result', 0, 'tsfn', '*')

  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_threadsafe_function_context (func: number, result: void_pp): napi_status {
  if (!func || !result) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  from64('result')

  const context = emnapiTSFN.getContext(func)
  makeSetValue('result', 0, 'context', '*')
  return napi_status.napi_ok
}

/** @__sig ippi */
export function napi_call_threadsafe_function (func: number, data: void_p, mode: napi_threadsafe_function_call_mode): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  from64('data')

  return emnapiTSFN.push(func, data as number, mode)
}

/** @__sig ip */
export function napi_acquire_threadsafe_function (func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')

  const mutex = emnapiTSFN.getMutex(func)
  return mutex.execute(() => {
    if (emnapiTSFN.getState(func) === State.kOpen) {
      emnapiTSFN.addThreadCount(func)
      return napi_status.napi_ok
    }
    return napi_status.napi_closing
  })
}

/** @__sig ipi */
export function napi_release_threadsafe_function (func: number, mode: napi_threadsafe_function_release_mode): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')

  const mutex = emnapiTSFN.getMutex(func)
  const cond = emnapiTSFN.getCond(func)
  let shouldDelete = false
  const ret = mutex.execute(() => {
    if (emnapiTSFN.getThreadCount(func) === 0) {
      return napi_status.napi_invalid_arg
    }

    emnapiTSFN.subThreadCount(func)

    if (emnapiTSFN.getThreadCount(func) === 0 || mode === napi_threadsafe_function_release_mode.napi_tsfn_abort) {
      if (emnapiTSFN.getState(func) === State.kOpen) {
        if (mode === napi_threadsafe_function_release_mode.napi_tsfn_abort) {
          emnapiTSFN.setState(func, State.kClosing)
        }
        if (emnapiTSFN.getState(func) === State.kClosing && emnapiTSFN.getMaxQueueSize(func) > 0) {
          cond.signal()
        }

        emnapiTSFN.send(func)
      }
    }

    if (!(emnapiTSFN.getState(func) === State.kClosed && emnapiTSFN.getThreadCount(func) === 0)) {
      return napi_status.napi_ok
    }
    shouldDelete = true
    return napi_status.napi_ok
  })
  if (shouldDelete) {
    emnapiTSFN.destroy(func)
  }
  return ret
}

/**
 * @__deps _emnapi_runtime_keepalive_pop
 * @__sig ipp
 */
export function napi_unref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  const asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2
  const arr = new Int32Array(wasmMemory.buffer)
  if (Atomics.load(arr, asyncRefOffset)) {
    Atomics.store(arr, asyncRefOffset, 0)
    __emnapi_runtime_keepalive_pop()
    emnapiCtx.decreaseWaitingRequestCounter()
  }
  return napi_status.napi_ok
}

/**
 * @__deps _emnapi_runtime_keepalive_push
 * @__sig ipp
 */
export function napi_ref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  const asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2
  const arr = new Int32Array(wasmMemory.buffer)
  if (!Atomics.load(arr, asyncRefOffset)) {
    Atomics.store(arr, asyncRefOffset, 1)
    __emnapi_runtime_keepalive_push()
    emnapiCtx.increaseWaitingRequestCounter()
  }
  return napi_status.napi_ok
}
