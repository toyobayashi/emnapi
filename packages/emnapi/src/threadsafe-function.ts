/* eslint-disable @typescript-eslint/indent */

import { ENVIRONMENT_IS_NODE, _malloc, wasmMemory, _free, ENVIRONMENT_IS_PTHREAD, abort, PThread } from 'emscripten:runtime'
import { emnapiCtx, emnapiNodeBinding, emnapiPostMessageTransport } from 'emnapi:shared'
import { POINTER_SIZE, to64, makeDynCall, from64 } from 'emscripten:parse-tools'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG } from './macro'
import { _emnapi_node_emit_async_destroy, _emnapi_node_emit_async_init } from './node'
import { _emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push } from './util'

const enum State {
  kOpen,
  kClosing,
  kClosed,
}

const enum Delivery {
  kSent,
  kDefinitelyNotDelivered,
  kAmbiguous,
}

function normalizeAddress (address: number): number {
// #if MEMORY64
  return address
// #else
  // eslint-disable-next-line no-unreachable
  return address >>> 0
// #endif
}

function normalizeEnd (end: number): number {
// #if MEMORY64
  return end
// #else
  // eslint-disable-next-line no-unreachable
  return end < 0 ? end >>> 0 : end
// #endif
}

function addressEnd (address: number, width: number): number {
  return normalizeAddress(address) + width
}

function atomicIndex (address: number, width: number): number {
  return Math.floor(normalizeAddress(address) / width)
}

/**
 * @__deps malloc
 * @__deps free
 * @__postset
 * ```
 * emnapiTSFN.init();
 * ```
 */
export const emnapiTSFN = {
  _liveSet: new Set<number>(),
  _sendRetryMap: new Map<number, { attempts: number }>(),
  offset: {
    __size__: 0,
    /* napi_ref */ resource: 0,
    /* double */ async_id: 0,
    /* double */ trigger_async_id: 0,
    /* size_t */ queue_size: 0,
    /* bool */ is_some: 0,
    /* void* */ queue: 0,
    // Reuse uv_async_t storage as JS-side wakeup state: pending event + scheduled drain.
    async_pending: 0,
    async_u_fd: 0,
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
    /* int32_t */ cond: 0
  },
  init () {
    emnapiTSFN._liveSet = new Set<number>()
    emnapiTSFN._sendRetryMap = new Map<number, { attempts: number }>()
// #if MEMORY64
    emnapiTSFN.offset.__size__ = NapiTSFNOffset64.__size__
    emnapiTSFN.offset.resource = NapiTSFNOffset64.async_resource_resource
    emnapiTSFN.offset.async_id = NapiTSFNOffset64.async_resource_async_context_async_id
    emnapiTSFN.offset.trigger_async_id = NapiTSFNOffset64.async_resource_async_context_trigger_async_id
    emnapiTSFN.offset.queue_size = NapiTSFNOffset64.queue_size
    emnapiTSFN.offset.is_some = NapiTSFNOffset64.async_resource_is_some
    emnapiTSFN.offset.queue = NapiTSFNOffset64.queue
    emnapiTSFN.offset.async_pending = NapiTSFNOffset64.async_pending
    emnapiTSFN.offset.async_u_fd = NapiTSFNOffset64.async_u_fd
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
    emnapiTSFN.offset.async_pending = NapiTSFNOffset32.async_pending
    emnapiTSFN.offset.async_u_fd = NapiTSFNOffset32.async_u_fd
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
      Object.values(PThread.pthreads).forEach(emnapiTSFN.addListener)
      const __original_getNewWorker = PThread.getNewWorker
      PThread.getNewWorker = function () {
        const r = __original_getNewWorker.apply(this, arguments as any)
        emnapiTSFN.addListener(r)
        return r
      }
      if (typeof PThread.terminateWorker === 'function') {
        const __original_terminateWorker = PThread.terminateWorker
        PThread.terminateWorker = function (worker: any) {
          emnapiTSFN.addListener(worker)
          emnapiTSFN.recoverAfterWorkerLoss()
          try {
            return __original_terminateWorker.apply(this, arguments as any)
          } finally {
            emnapiTSFN.recoverAfterWorkerLoss()
          }
        }
      }
    }
  },
  addListener (worker: any) {
    if (!worker) return false
    emnapiTSFN.wrapWorkerTerminate(worker)
    if (worker._emnapiTSFNListener) return true
    const handler = function (e: any): void {
      const data = ENVIRONMENT_IS_NODE ? e : e.data
      const __emnapi__ = data?.__emnapi__
      if (__emnapi__) {
        const type = __emnapi__.type
        const payload = __emnapi__.payload
        if (
          type === 'tsfn-send' &&
          payload &&
          typeof payload.tsfn === 'number' &&
          emnapiTSFN._liveSet.has(payload.tsfn)
        ) {
          const pending = payload.tsfn + emnapiTSFN.offset.async_pending
          const state = new Int32Array(
            emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))
          )
          Atomics.store(state, atomicIndex(pending, 4), 2)
          emnapiTSFN.enqueue(payload.tsfn)
        }
      }
    }
    const handleWorkerLoss = function (): void {
      emnapiTSFN.recoverAfterWorkerLoss()
      dispose()
    }
    const dispose = function (): void {
      if (ENVIRONMENT_IS_NODE) {
        worker.off('message', handler)
        worker.off('exit', handleWorkerLoss)
      } else {
        worker.removeEventListener('message', handler, false)
      }
      delete worker._emnapiTSFNListener
    }
    worker._emnapiTSFNListener = { handler, dispose }
    if (ENVIRONMENT_IS_NODE) {
      worker.on('message', handler)
      worker.once('exit', handleWorkerLoss)
    } else {
      worker.addEventListener('message', handler, false)
    }
    return true
  },
  wrapWorkerTerminate (worker: any): void {
    if (
      typeof worker.terminate !== 'function' ||
      worker._emnapiTSFNTerminate
    ) {
      return
    }
    const original = worker.terminate
    const wrapped = function (this: any): any {
      emnapiTSFN.recoverAfterWorkerLoss()
      try {
        return original.apply(this, arguments as any)
      } finally {
        emnapiTSFN.recoverAfterWorkerLoss()
      }
    }
    worker._emnapiTSFNTerminate = { original, wrapped }
    worker.terminate = wrapped
  },
  recoverAfterWorkerLoss (): void {
    if ((typeof ENVIRONMENT_IS_PTHREAD !== 'undefined') && ENVIRONMENT_IS_PTHREAD) {
      return
    }
    const live = Array.from(emnapiTSFN._liveSet)
    for (let i = 0; i < live.length; i++) {
      const func = live[i]
      if (!emnapiTSFN._liveSet.has(func)) {
        continue
      }
      const pending = func + emnapiTSFN.offset.async_pending
      const state = new Int32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))
      )
      const index = atomicIndex(pending, 4)
      let current = Atomics.load(state, index)
      while (current !== 0) {
        const previous = Atomics.compareExchange(state, index, current, 2)
        if (previous === current) {
          emnapiTSFN.enqueue(func)
          break
        }
        current = previous
      }
    }
  },
  getPostMessage (): {
    post: (message: any) => unknown
    throwsAreDefinitelyNotDelivered: boolean
  } | undefined {
    const transport = emnapiPostMessageTransport
    if (transport && typeof transport.post === 'function') {
      return transport
    }
    const globalPostMessage = typeof postMessage === 'function'
      ? postMessage
      : undefined
    if (globalPostMessage) {
      return {
        post: globalPostMessage.bind(globalThis),
        throwsAreDefinitelyNotDelivered: true
      }
    }
    return undefined
  },
  postMessage (message: any): Delivery {
    const transport = emnapiTSFN.getPostMessage()
    if (!transport) {
      return Delivery.kDefinitelyNotDelivered
    }
    let result: unknown
    try {
      result = transport.post(message)
    } catch (err) {
      let definitelyNotDelivered = transport.throwsAreDefinitelyNotDelivered
      if (
        !definitelyNotDelivered &&
        err &&
        (typeof err === 'object' || typeof err === 'function')
      ) {
        try {
          definitelyNotDelivered = Boolean(
            (err as { emnapiNotDelivered?: boolean }).emnapiNotDelivered
          )
        } catch (_) {
          return Delivery.kAmbiguous
        }
      }
      return definitelyNotDelivered
        ? Delivery.kDefinitelyNotDelivered
        : Delivery.kAmbiguous
    }
    if (
      !result ||
      (typeof result !== 'object' && typeof result !== 'function')
    ) {
      return Delivery.kSent
    }
    let then: unknown
    try {
      then = (result as { then?: unknown }).then
    } catch (_) {
      return Delivery.kAmbiguous
    }
    if (typeof then === 'function') {
      try {
        then.call(result, undefined, () => {})
      } catch (_) {}
      return Delivery.kAmbiguous
    }
    return Delivery.kSent
  },
  getFeature (): any {
    return typeof emnapiCtx === 'object'
      ? emnapiCtx?.feature
      : undefined
  },
  schedule (callback: () => void): void {
    const feature = emnapiTSFN.getFeature()
    if (typeof feature?.setImmediate === 'function') {
      feature.setImmediate(callback)
      return
    }
    if (typeof (globalThis as any).setImmediate === 'function') {
      ;(globalThis as any).setImmediate(callback)
      return
    }
    if (typeof (globalThis as any).setTimeout === 'function') {
      ;(globalThis as any).setTimeout(callback, 0)
      return
    }
    void Promise.resolve().then(callback)
  },
  scheduleRetry (callback: () => void, attempts: number): void {
    if (attempts < 3) {
      emnapiTSFN.schedule(callback)
      return
    }
    const delay = Math.min(2 ** Math.min(attempts - 3, 10), 1000)
    const setTimeout = typeof (globalThis as any).setTimeout === 'function'
      ? (globalThis as any).setTimeout.bind(globalThis)
      : undefined
    if (!setTimeout) {
      emnapiTSFN.schedule(callback)
      return
    }
    const timer = setTimeout(callback, delay)
    if (
      timer &&
      (typeof timer === 'object' || typeof timer === 'function') &&
      typeof timer.unref === 'function'
    ) {
      timer.unref()
    }
  },
  createMessage (func: number): any {
    return {
      __emnapi__: {
        type: 'tsfn-send',
        payload: { tsfn: func }
      }
    }
  },
  scheduleSendRetry (func: number): void {
    if (emnapiTSFN._sendRetryMap.has(func)) {
      return
    }
    const retry = { attempts: 0 }
    emnapiTSFN._sendRetryMap.set(func, retry)
    const run = (): void => {
      if (emnapiTSFN._sendRetryMap.get(func) !== retry) {
        return
      }
      const isPthread = (
        (typeof ENVIRONMENT_IS_PTHREAD !== 'undefined') &&
        ENVIRONMENT_IS_PTHREAD
      )
      // Only the creator owns `_liveSet`; child agents use the shared pending
      // state to decide when an in-flight wakeup has been observed.
      if (!isPthread && !emnapiTSFN._liveSet.has(func)) {
        emnapiTSFN._sendRetryMap.delete(func)
        return
      }
      const pending = func + emnapiTSFN.offset.async_pending
      const state = new Int32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))
      )
      if (Atomics.load(state, atomicIndex(pending, 4)) !== 1) {
        emnapiTSFN._sendRetryMap.delete(func)
        return
      }
      const delivery = emnapiTSFN.postMessage(
        emnapiTSFN.createMessage(func)
      )
      if (
        delivery === Delivery.kSent ||
        Atomics.load(
          new Int32Array(
            emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))
          ),
          atomicIndex(pending, 4)
        ) !== 1
      ) {
        emnapiTSFN._sendRetryMap.delete(func)
        return
      }
      retry.attempts++
      emnapiTSFN.scheduleRetry(run, retry.attempts)
    }
    emnapiTSFN.schedule(run)
  },
  /**
   * When another thread grows the shared WebAssembly.Memory, this agent's
   * cached `wasmMemory.buffer` may still have the old shorter length
   * (V8 refreshes it lazily). If a pointer derived from shared memory lies
   * beyond the cached length, `wasmMemory.grow(0)` forces the agent to
   * observe the current memory size and refreshes the buffer.
  */
  ensureBufferFor (end: number): ArrayBufferLike {
    end = normalizeEnd(end)
    let buffer = wasmMemory.buffer
    if (end > buffer.byteLength) {
      wasmMemory.grow(0)
      buffer = wasmMemory.buffer
    }
    return buffer
  },
  zeroMemory (address: number, size: number): void {
    const byteOffset = normalizeAddress(address)
    new Uint8Array(
      emnapiTSFN.ensureBufferFor(byteOffset + size),
      byteOffset,
      size
    ).fill(0)
  },
  getFloat64 (address: number): number {
    address = normalizeAddress(address)
    return new DataView(
      emnapiTSFN.ensureBufferFor(address + 8)
    ).getFloat64(address, true)
  },
  setInt8 (address: number, value: number): void {
    address = normalizeAddress(address)
    new DataView(
      emnapiTSFN.ensureBufferFor(address + 1)
    ).setInt8(address, value)
  },
  setUint32 (address: number, value: number): void {
    address = normalizeAddress(address)
    new DataView(
      emnapiTSFN.ensureBufferFor(address + 4)
    ).setUint32(address, value, true)
  },
  initQueue (func: number): boolean {
    const size = 2 * POINTER_SIZE
    const queue = _malloc(to64('size'))
    if (!queue) return false
    from64('queue')
    emnapiTSFN.zeroMemory(queue, size)
    emnapiTSFN.storeSizeTypeValue(func + emnapiTSFN.offset.queue, queue, false)
    return true
  },
  destroyQueue (func: number) {
    const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false)
    if (queue) {
      let node = emnapiTSFN.loadSizeTypeValue(queue, false)
      while (node !== 0) {
        const next = emnapiTSFN.loadSizeTypeValue(node + POINTER_SIZE, false)
        _free(to64('node') as number)
        node = next
      }
      _free(to64('queue') as number)
    }
  },
  pushQueue (func: number, data: number): number {
    const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false)
    const head = emnapiTSFN.loadSizeTypeValue(queue, false)
    const tail = emnapiTSFN.loadSizeTypeValue(queue + POINTER_SIZE, false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const size = 2 * POINTER_SIZE
    const node = _malloc(to64('size'))
    if (!node) throw new Error('OOM')
    from64('node')
    emnapiTSFN.storeSizeTypeValue(node, data, false)
    emnapiTSFN.storeSizeTypeValue(node + POINTER_SIZE, 0, false)
    if (head === 0 && tail === 0) {
      emnapiTSFN.storeSizeTypeValue(queue, node, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, node, false)
    } else {
      emnapiTSFN.storeSizeTypeValue(tail + POINTER_SIZE, node, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, node, false)
    }
    emnapiTSFN.addQueueSize(func)
    return node
  },
  removeQueueNode (func: number, node: number): void {
    const queue = emnapiTSFN.loadSizeTypeValue(
      func + emnapiTSFN.offset.queue,
      true
    )
    const head = emnapiTSFN.loadSizeTypeValue(queue, true)
    const tail = emnapiTSFN.loadSizeTypeValue(queue + POINTER_SIZE, true)
    if (tail !== node) {
      throw new Error('TSFN queue rollback target is not the tail')
    }
    if (head === node) {
      emnapiTSFN.storeSizeTypeValue(queue, 0, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, 0, false)
    } else {
      let previous = head
      while (
        previous !== 0 &&
        emnapiTSFN.loadSizeTypeValue(
          previous + POINTER_SIZE,
          true
        ) !== node
      ) {
        previous = emnapiTSFN.loadSizeTypeValue(
          previous + POINTER_SIZE,
          true
        )
      }
      if (previous === 0) {
        throw new Error('TSFN queue rollback target was not found')
      }
      emnapiTSFN.storeSizeTypeValue(previous + POINTER_SIZE, 0, false)
      emnapiTSFN.storeSizeTypeValue(queue + POINTER_SIZE, previous, false)
    }
    _free(to64('node') as number)
    emnapiTSFN.subQueueSize(func)
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
        const node = emnapiTSFN.pushQueue(func, data)
        const status = emnapiTSFN.send(func)
        if (status !== napi_status.napi_ok) {
          emnapiTSFN.removeQueueNode(func, node)
          return status
        }
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
        const byteOffset = normalizeAddress(index)
        const i32a = new Int32Array(
          emnapiTSFN.ensureBufferFor(byteOffset + 4),
          byteOffset,
          1
        )
        if (isBrowserMain) {
          while (true) {
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 10)
            if (oldValue === 0) {
              return
            }
          }
        } else {
          while (true) {
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 10)
            if (oldValue === 0) {
              return
            }
            Atomics.wait(i32a, 0, 10)
          }
        }
      },
      /* lockAsync () {
        return new Promise<void>(resolve => {
          const again = (): void => { fn() }
          const fn = (): void => {
            const byteOffset = normalizeAddress(index)
            const i32a = new Int32Array(
              emnapiTSFN.ensureBufferFor(byteOffset + 4),
              byteOffset,
              1
            )
            const oldValue = Atomics.compareExchange(i32a, 0, 0, 10)
            if (oldValue === 0) {
              resolve()
              return
            }
            (Atomics as any).waitAsync(i32a, 0, 10).value.then(again)
          }
          fn()
        })
      }, */
      unlock () {
        const byteOffset = normalizeAddress(index)
        const i32a = new Int32Array(
          emnapiTSFN.ensureBufferFor(byteOffset + 4),
          byteOffset,
          1
        )
        const oldValue = Atomics.compareExchange(i32a, 0, 10, 0)
        if (oldValue !== 10) {
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
        const byteOffset = normalizeAddress(index)
        const i32a = new Int32Array(
          emnapiTSFN.ensureBufferFor(byteOffset + 4),
          byteOffset,
          1
        )
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        Atomics.wait(i32a, 0, value)
        mutex.lock()
      },
      /* waitAsync () {
        const byteOffset = normalizeAddress(index)
        const i32a = new Int32Array(
          emnapiTSFN.ensureBufferFor(byteOffset + 4),
          byteOffset,
          1
        )
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
        const byteOffset = normalizeAddress(index)
        const i32a = new Int32Array(
          emnapiTSFN.ensureBufferFor(byteOffset + 4),
          byteOffset,
          1
        )
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
    arr = new BigUint64Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 8))
    )
    index = atomicIndex(func + offset, 8)
// #else
    arr = new Uint32Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 4))
    )
    index = atomicIndex(func + offset, 4)
// #endif
    Atomics.add(arr, index, to64('1') as any)
  },
  subQueueSize (func: number): void {
    const offset = emnapiTSFN.offset.queue_size
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 8))
    )
    index = atomicIndex(func + offset, 8)
// #else
    arr = new Uint32Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 4))
    )
    index = atomicIndex(func + offset, 4)
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
    arr = new BigUint64Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 8))
    )
    index = atomicIndex(func + offset, 8)
// #else
    arr = new Uint32Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 4))
    )
    index = atomicIndex(func + offset, 4)
// #endif
    Atomics.add(arr, index, to64('1') as any)
  },
  subThreadCount (func: number): void {
    const offset = emnapiTSFN.offset.thread_count
    let arr: any, index: number
// #if MEMORY64
    arr = new BigUint64Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 8))
    )
    index = atomicIndex(func + offset, 8)
// #else
    arr = new Uint32Array(
      emnapiTSFN.ensureBufferFor(addressEnd(func + offset, 4))
    )
    index = atomicIndex(func + offset, 4)
// #endif
    Atomics.sub(arr, index, to64('1') as any)
  },
  getState (func: number): number {
    const address = func + emnapiTSFN.offset.state
    return Atomics.load(
      new Int32Array(emnapiTSFN.ensureBufferFor(addressEnd(address, 4))),
      atomicIndex(address, 4)
    )
  },
  setState (func: number, value: 0 | 1 | 2): void {
    const address = func + emnapiTSFN.offset.state
    Atomics.store(
      new Int32Array(emnapiTSFN.ensureBufferFor(addressEnd(address, 4))),
      atomicIndex(address, 4),
      value
    )
  },
  getHandlesClosing (func: number): number {
    const address = normalizeAddress(
      func + emnapiTSFN.offset.handles_closing
    )
    return Atomics.load(
      new Int8Array(emnapiTSFN.ensureBufferFor(address + 1)),
      address
    )
  },
  setHandlesClosing (func: number, value: 0 | 1): void {
    const address = normalizeAddress(
      func + emnapiTSFN.offset.handles_closing
    )
    Atomics.store(
      new Int8Array(emnapiTSFN.ensureBufferFor(address + 1)),
      address,
      value
    )
  },
  getDispatchState (func: number): number {
    const address = func + emnapiTSFN.offset.dispatch_state
    return Atomics.load(
      new Uint32Array(emnapiTSFN.ensureBufferFor(addressEnd(address, 4))),
      atomicIndex(address, 4)
    )
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
      arr = new BigUint64Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 8))
      )
      ret = Number(Atomics.load(arr, atomicIndex(offset, 8)))
// #else
      arr = new Uint32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 4))
      )
      ret = Atomics.load(arr, atomicIndex(offset, 4))
// #endif
      return ret
    } else {
// #if MEMORY64
      arr = new BigInt64Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 8))
      )
      ret = Number(Atomics.load(arr, atomicIndex(offset, 8)))
// #else
      arr = new Int32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 4))
      )
      ret = Atomics.load(arr, atomicIndex(offset, 4))
// #endif
      return ret
    }
  },
  storeSizeTypeValue (offset: number, value: number, unsigned: boolean): void {
    let arr: any
    if (unsigned) {
// #if MEMORY64
      arr = new BigUint64Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 8))
      )
      Atomics.store(arr, atomicIndex(offset, 8), BigInt(value) as any)
// #else
      arr = new Uint32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 4))
      )
      Atomics.store(arr, atomicIndex(offset, 4), value)
// #endif
      return undefined
    } else {
// #if MEMORY64
      arr = new BigInt64Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 8))
      )
      Atomics.store(arr, atomicIndex(offset, 8), BigInt(value) as any)
// #else
      arr = new Int32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(offset, 4))
      )
      Atomics.store(arr, atomicIndex(offset, 4), value >>> 0)
// #endif
      return undefined
    }
  },
  releaseResources (func: number) {
    if (emnapiTSFN.getState(func) !== State.kClosed) {
      emnapiTSFN.setState(func, State.kClosed)

      const env = emnapiTSFN.getEnv(func)
      const envObject = emnapiCtx.envStore.get(env)!
      const ref = emnapiTSFN.getRef(func)
      if (ref) {
        emnapiCtx.refStore.get(ref)!.dispose()
      }
      const resource = emnapiTSFN.getResource(func)
      emnapiCtx.refStore.get(resource)!.dispose()
      emnapiTSFN.setInt8(func + emnapiTSFN.offset.is_some, 0)

      emnapiCtx.removeCleanupHook(envObject, emnapiTSFN.cleanup, func)
      envObject.unref()

      const asyncRefAddress = func + emnapiTSFN.offset.async_ref
      const asyncRefOffset = atomicIndex(asyncRefAddress, 4)
      const arr = new Uint32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(asyncRefAddress, 4))
      )
      if (Atomics.load(arr, asyncRefOffset) > 0) {
        Atomics.store(arr, asyncRefOffset, 0)
        _emnapi_runtime_keepalive_pop()
        emnapiCtx.decreaseWaitingRequestCounter()
      }

      if (emnapiNodeBinding) {
        const asyncId = emnapiTSFN.getFloat64(
          func + emnapiTSFN.offset.async_id
        )
        const triggerAsyncId = emnapiTSFN.getFloat64(
          func + emnapiTSFN.offset.trigger_async_id
        )
        _emnapi_node_emit_async_destroy(asyncId, triggerAsyncId)
      }
    }
  },
  destroy (func: number) {
    emnapiTSFN._liveSet.delete(func)
    emnapiTSFN._sendRetryMap.delete(func)
    emnapiTSFN.destroyQueue(func)
    emnapiTSFN.releaseResources(func)
    _free(to64('func') as number)
  },
  emptyQueue (func: number) {
    const drainQueue: number[] = []
    emnapiTSFN.getMutex(func).execute(() => {
      while (emnapiTSFN.getQueueSize(func) > 0) {
        drainQueue.push(emnapiTSFN.shiftQueue(func))
      }
    })
    const callJsCb = emnapiTSFN.getCallJSCb(func)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const context = emnapiTSFN.getContext(func)
    let data: number
    for (let i = 0; i < drainQueue.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data = drainQueue[i]
      if (callJsCb) {
        makeDynCall('vpppp', 'callJsCb')(to64('0'), to64('0'), to64('context'), to64('data'))
      }
    }
  },
  maybeDelete (func: number) {
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
    const envObject = emnapiCtx.envStore.get(env)!
    emnapiCtx.openScope(envObject)

    const finalize = emnapiTSFN.getFinalizeCb(func)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = emnapiTSFN.getFinalizeData(func)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      emnapiTSFN.emptyQueue(func)
      if (finalize) {
        if (emnapiNodeBinding) {
          const resource = emnapiTSFN.getResource(func)
          const resource_value = emnapiCtx.refStore.get(resource)!.get()
          const resourceObject = emnapiCtx.handleStore.get(resource_value)!.value
          const asyncId = emnapiTSFN.getFloat64(
            func + emnapiTSFN.offset.async_id
          )
          const triggerAsyncId = emnapiTSFN.getFloat64(
            func + emnapiTSFN.offset.trigger_async_id
          )
          emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
            asyncId,
            triggerAsyncId
          })
        } else {
          f()
        }
      }
      emnapiTSFN.maybeDelete(func)
    } finally {
      emnapiCtx.closeScope(envObject)
    }
  },
  cleanup (func: number) {
    emnapiTSFN.closeHandlesAndMaybeDelete(func, 1)
  },
  closeHandlesAndMaybeDelete (func: number, set_closing: number) {
    const env = emnapiTSFN.getEnv(func)
    const envObject = emnapiCtx.envStore.get(env)!
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
      const pending = func + emnapiTSFN.offset.async_pending
      Atomics.store(
        new Int32Array(emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))),
        atomicIndex(pending, 4),
        1
      )
      emnapiTSFN.schedule(() => {
        emnapiTSFN.finalize(func)
      })
    } finally {
      emnapiCtx.closeScope(envObject)
    }
  },
  dispatchOne (func: number): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const envObject = emnapiCtx.envStore.get(env)!
      emnapiCtx.openScope(envObject)

      const f = (): void => {
        (envObject as NodeEnv).callbackIntoModule(false, () => {
          const callJsCb = emnapiTSFN.getCallJSCb(func)
          const ref = emnapiTSFN.getRef(func)
          const js_callback = ref ? emnapiCtx.refStore.get(ref)!.get() : 0
          if (callJsCb) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const context = emnapiTSFN.getContext(func)
            makeDynCall('vpppp', 'callJsCb')(to64('env'), to64('js_callback'), to64('context'), to64('data'))
          } else {
            const jsCallback = js_callback ? emnapiCtx.handleStore.get(js_callback)!.value : null
            if (typeof jsCallback === 'function') {
              jsCallback()
            }
          }
        })
      }

      try {
        if (emnapiNodeBinding) {
          const resource = emnapiTSFN.getResource(func)
          const resource_value = emnapiCtx.refStore.get(resource)!.get()
          const resourceObject = emnapiCtx.handleStore.get(resource_value)!.value
          emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
            asyncId: emnapiTSFN.getFloat64(
              func + emnapiTSFN.offset.async_id
            ),
            triggerAsyncId: emnapiTSFN.getFloat64(
              func + emnapiTSFN.offset.trigger_async_id
            )
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
    const dispatchStateAddress = func + emnapiTSFN.offset.dispatch_state
    const index = atomicIndex(dispatchStateAddress, 4)
    while (has_more && --iterations_left !== 0) {
      Atomics.store(
        new Uint32Array(
          emnapiTSFN.ensureBufferFor(addressEnd(dispatchStateAddress, 4))
        ),
        index,
        1
      )
      try {
        has_more = emnapiTSFN.dispatchOne(func)
      } catch (err) {
        if (emnapiTSFN._liveSet.has(func)) {
          // A callback exception must not strand kDispatchRunning.
          Atomics.exchange(
            new Uint32Array(
              emnapiTSFN.ensureBufferFor(
                addressEnd(dispatchStateAddress, 4)
              )
            ),
            index,
            0
          )
          emnapiTSFN.send(func)
        }
        throw err
      }
      if (!emnapiTSFN._liveSet.has(func)) {
        return
      }

      if (Atomics.exchange(
        new Uint32Array(
          emnapiTSFN.ensureBufferFor(addressEnd(dispatchStateAddress, 4))
        ),
        index,
        0
      ) !== 1) {
        has_more = true
      }
    }

    if (has_more) {
      emnapiTSFN.send(func)
    }
  },
  enqueue (func: number): void {
    // `pending` means a worker thread has requested a wakeup that has not
    // been drained on the main thread yet.
    const pending = func + emnapiTSFN.offset.async_pending
    // `scheduled` prevents queueing the same main-thread drain chain more than
    // once while a previous wakeup is still in flight.
    const scheduled = func + emnapiTSFN.offset.async_u_fd
    const end = Math.max(
      normalizeAddress(pending),
      normalizeAddress(scheduled)
    ) + 4
    const state = (): Int32Array => new Int32Array(
      emnapiTSFN.ensureBufferFor(end)
    )
    const pendingIndex = atomicIndex(pending, 4)
    const scheduledIndex = atomicIndex(scheduled, 4)
    if (Atomics.exchange(state(), scheduledIndex, 1) !== 0) {
      return
    }

    // Match uv_async_send-style coalescing in JS: the first turn represents
    // the wakeup reaching the main thread, and the second turn performs the
    // actual TSFN drain after nearby Send/Signal calls have had a chance to
    // collapse into the shared AsyncProgressWorker state.
    emnapiTSFN.schedule(() => {
      if (!emnapiTSFN._liveSet.has(func)) {
        return
      }
      if (Atomics.load(state(), pendingIndex) === 0) {
        Atomics.store(state(), scheduledIndex, 0)
        return
      }

      emnapiTSFN.schedule(() => {
        try {
          // Consume the coalesced wakeup once, then let dispatch() observe any
          // queue mutations through dispatch_state like the C implementation.
          if (Atomics.exchange(state(), pendingIndex, 0) === 0) {
            return
          }
          // After destroy(), the func address is freed.  Skip dispatch
          // to avoid use-after-free (JS-side lifecycle check).
          if (!emnapiTSFN._liveSet.has(func)) {
            return
          }
          emnapiTSFN.dispatch(func)
        } finally {
          // Allow a later wakeup to schedule a new drain chain. If another
          // worker-thread send raced with this drain, enqueue one more turn.
          if (emnapiTSFN._liveSet.has(func)) {
            Atomics.store(state(), scheduledIndex, 0)
            if (Atomics.load(state(), pendingIndex) !== 0) {
              emnapiTSFN.enqueue(func)
            }
          }
        }
      })
    })
  },
  send (func: number): napi_status {
    const dispatchStateAddress = func + emnapiTSFN.offset.dispatch_state
    const current_state = Atomics.or(
      new Uint32Array(
        emnapiTSFN.ensureBufferFor(addressEnd(dispatchStateAddress, 4))
      ),
      atomicIndex(dispatchStateAddress, 4),
      1 << 1
    )
    if ((current_state & 1) === 1) {
      return napi_status.napi_ok
    }

    const pending = func + emnapiTSFN.offset.async_pending
    const state = (): Int32Array => new Int32Array(
      emnapiTSFN.ensureBufferFor(addressEnd(pending, 4))
    )
    const index = atomicIndex(pending, 4)
    // A wakeup is already pending, so this send only needs to leave the queued
    // work in the TSFN queue and let the existing drain pick it up.
    if (Atomics.load(state(), index) !== 0) {
      return napi_status.napi_ok
    }

    if (Atomics.exchange(state(), index, 1) === 0) {
      if ((typeof ENVIRONMENT_IS_PTHREAD !== 'undefined') && ENVIRONMENT_IS_PTHREAD) {
        // Worker threads only post a wakeup token. Main-thread draining is
        // serialized by enqueue() once the message is received.
        const delivery = emnapiTSFN.postMessage(
          emnapiTSFN.createMessage(func)
        )
        if (delivery === Delivery.kDefinitelyNotDelivered) {
          if (Atomics.compareExchange(state(), index, 1, 0) === 1) {
            return napi_status.napi_generic_failure
          }
        } else if (
          delivery === Delivery.kAmbiguous &&
          Atomics.load(state(), index) === 1
        ) {
          emnapiTSFN.scheduleSendRetry(func)
        }
      } else {
        // On the main thread we can skip the cross-thread hop and schedule the
        // coalesced drain chain directly.
        emnapiTSFN.enqueue(func)
      }
    }
    return napi_status.napi_ok
  }
}

/** @__sig ippppppppppp */
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
  const envObject = $CHECK_ENV_NOT_IN_GC!(env)
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
    const funcValue = emnapiCtx.handleStore.get(func)!.value
    if (typeof funcValue !== 'function') {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ref = emnapiCtx.createReference(envObject, func, 1, ReferenceOwnership.kUserland as any).id
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
  const sizeofTSFN = emnapiTSFN.offset.__size__
  // eslint-disable-next-line prefer-const
  let tsfn = _malloc(to64('sizeofTSFN'))
  if (!tsfn) return envObject.setLastError(napi_status.napi_generic_failure)
  from64('tsfn')
  emnapiTSFN.zeroMemory(tsfn as number, sizeofTSFN)
  const resourceRef = emnapiCtx.createReference(envObject, resource, 1, ReferenceOwnership.kUserland as any)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resource_ = resourceRef.id
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.resource,
    resource_,
    false
  )
  if (!emnapiTSFN.initQueue(tsfn as number)) {
    _free(to64('tsfn') as number)
    resourceRef.dispose()
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  _emnapi_node_emit_async_init(
    resource,
    resource_name,
    -1,
    normalizeAddress(tsfn as number + emnapiTSFN.offset.async_id)
  )
  emnapiTSFN.setInt8(tsfn as number + emnapiTSFN.offset.is_some, 1)
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.thread_count,
    initial_thread_count,
    true
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.context,
    context as number,
    false
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.max_queue_size,
    max_queue_size,
    true
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.ref,
    ref,
    false
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.env,
    env as number,
    false
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.finalize_data,
    thread_finalize_data as number,
    false
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.finalize_cb,
    thread_finalize_cb as number,
    false
  )
  emnapiTSFN.storeSizeTypeValue(
    tsfn as number + emnapiTSFN.offset.call_js_cb,
    call_js_cb,
    false
  )
  emnapiCtx.addCleanupHook(envObject, emnapiTSFN.cleanup, tsfn)
  emnapiTSFN._sendRetryMap.delete(tsfn as number)
  emnapiTSFN._liveSet.add(tsfn as number)
  envObject.ref()

  _emnapi_runtime_keepalive_push()
  emnapiCtx.increaseWaitingRequestCounter()
  emnapiTSFN.setUint32(tsfn as number + emnapiTSFN.offset.async_ref, 1)

  from64('result')
  emnapiTSFN.storeSizeTypeValue(result, tsfn as number, false)

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const context = emnapiTSFN.getContext(func)
  emnapiTSFN.storeSizeTypeValue(result, context, false)
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

  return emnapiTSFN.push(func, data, mode)
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

/** @__sig ipp */
export function napi_unref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  const asyncRefAddress = func + emnapiTSFN.offset.async_ref
  const asyncRefOffset = atomicIndex(asyncRefAddress, 4)
  const arr = new Uint32Array(
    emnapiTSFN.ensureBufferFor(addressEnd(asyncRefAddress, 4))
  )
  const currentValue = Atomics.load(arr, asyncRefOffset)
  if (currentValue > 0) {
    Atomics.store(arr, asyncRefOffset, currentValue - 1)
    if (currentValue === 1) {
      _emnapi_runtime_keepalive_pop()
      emnapiCtx.decreaseWaitingRequestCounter()
    }
  }
  return napi_status.napi_ok
}

/** @__sig ipp */
export function napi_ref_threadsafe_function (env: napi_env, func: number): napi_status {
  if (!func) {
    abort()
    return napi_status.napi_invalid_arg
  }
  from64('func')
  const asyncRefAddress = func + emnapiTSFN.offset.async_ref
  const asyncRefOffset = atomicIndex(asyncRefAddress, 4)
  const arr = new Uint32Array(
    emnapiTSFN.ensureBufferFor(addressEnd(asyncRefAddress, 4))
  )
  const currentValue = Atomics.load(arr, asyncRefOffset)
  if (!currentValue) {
    _emnapi_runtime_keepalive_push()
    emnapiCtx.increaseWaitingRequestCounter()
  }
  Atomics.store(arr, asyncRefOffset, currentValue + 1)
  return napi_status.napi_ok
}
