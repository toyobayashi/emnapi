import { emnapiEnv, onCreateWorker, napiModule, singleThreadAsyncWork, _emnapi_async_work_pool_size } from 'emnapi:shared'
import { PThread, ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD, wasmInstance, _free, wasmMemory, _malloc, abort } from 'emscripten:runtime'
import { POINTER_SIZE, to64, makeDynCall, makeSetValue, from64, makeGetValue } from 'emscripten:parse-tools'
import { emnapiAWST } from '../async-work'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG, $CHECK_ENV } from '../macro'
// import { _emnapi_node_emit_async_init, _emnapi_node_emit_async_destroy } from '../node'
// import { _emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push } from '../util'

declare var emnapiPluginCtx: any
declare var emnapiCtx: Context
declare var emnapiNodeBinding: NodeBinding | undefined

const {
  // onCreateWorker, napiModule, singleThreadAsyncWork, _emnapi_async_work_pool_size,
  // PThread, ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD, wasmInstance, _free, wasmMemory, _malloc,
  _emnapi_node_emit_async_init, _emnapi_node_emit_async_destroy,
  _emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push
} = emnapiPluginCtx

const enum AsyncWorkStatus {
  Pending = 0,
  Cancelled = 1,
  Completed = 2
}

var emnapiAWMT = {
  pool: [] as any[],
  workerReady: null as (Promise<any> & { ready: boolean }) | null,
  globalAddress: 0,
  globalOffset: {
    idle_threads: 0,
    q: 1 * POINTER_SIZE,
    next: 1 * POINTER_SIZE,
    prev: 2 * POINTER_SIZE,
    mutex: 3 * POINTER_SIZE,
    cond: 4 * POINTER_SIZE,
    exit_message: 5 * POINTER_SIZE,
    end: 7 * POINTER_SIZE
  },
  offset: {
    /* napi_ref */ resource: 0,
    /* double */ async_id: 8,
    /* double */ trigger_async_id: 16,
    /* napi_env */ env: 24,
    /* int32_t */ status: 1 * POINTER_SIZE + 24, // 0 for pending, 1 for cancelled, 2 for completed
    queue: 2 * POINTER_SIZE + 24,
    queue_next: 2 * POINTER_SIZE + 24,
    queue_prev: 3 * POINTER_SIZE + 24,
    /* void* */ data: 4 * POINTER_SIZE + 24,
    /* napi_async_execute_callback */ execute: 5 * POINTER_SIZE + 24,
    /* napi_async_complete_callback */ complete: 6 * POINTER_SIZE + 24,
    end: 7 * POINTER_SIZE + 24
  },
  init () {
    emnapiAWMT.pool = []
    emnapiAWMT.workerReady = null

    if (typeof PThread !== 'undefined') {
      PThread.unusedWorkers.forEach(emnapiAWMT.addListener)
      PThread.runningWorkers.forEach(emnapiAWMT.addListener)
      const __original_getNewWorker = PThread.getNewWorker
      PThread.getNewWorker = function () {
        const r = __original_getNewWorker.apply(this, arguments as any)
        emnapiAWMT.addListener(r)
        return r
      }
    }
  },
  addListener (worker: any) {
    if (!worker) return false
    if (worker._emnapiAWMTListener) return true
    const handler = function (e: any): void {
      const data = ENVIRONMENT_IS_NODE ? e : e.data
      const __emnapi__ = data.__emnapi__
      if (__emnapi__) {
        const type = __emnapi__.type
        const payload = __emnapi__.payload
        if (type === 'async-work-complete') {
          emnapiAWMT.callComplete(payload.work, napi_status.napi_ok)
        }
      }
    }
    const dispose = function (): void {
      if (ENVIRONMENT_IS_NODE) {
        worker.off('message', handler)
      } else {
        worker.removeEventListener('message', handler, false)
      }
      delete worker._emnapiAWMTListener
    }
    worker._emnapiAWMTListener = { handler, dispose }
    if (ENVIRONMENT_IS_NODE) {
      worker.on('message', handler)
    } else {
      worker.addEventListener('message', handler, false)
    }
    return true
  },
  initGlobal (): void {
    if (!emnapiAWMT.globalAddress) {
      emnapiAWMT.globalAddress = _malloc(to64('emnapiAWMT.globalOffset.end') as number) as number
      // Ensure the shared state is zero-initialized before use so that
      // idle_threads/mutex/cond and related fields start from a known state.
      from64('emnapiAWMT.globalAddress')
      const size = emnapiAWMT.globalOffset.end
      const addr = emnapiAWMT.globalAddress
      new Uint8Array(wasmMemory.buffer, addr, size).fill(0)
      emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q)
      emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.exit_message)
    }
  },
  terminateWorkers (): void {
    emnapiAWMT.pool.forEach(w => {
      w._emnapiAWMTListener?.dispose()
      w._emnapiTSFNListener?.dispose()
      w.terminate()
    })
    emnapiAWMT.pool.length = 0
  },
  initWorkers (n: number): Promise<any> {
    if (ENVIRONMENT_IS_PTHREAD) {
      return emnapiAWMT.workerReady || (emnapiAWMT.workerReady = Promise.resolve() as any)
    }
    if (emnapiAWMT.workerReady) return emnapiAWMT.workerReady
    if (!('emnapi_async_worker_create' in wasmInstance.exports)) {
      throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags')
    }
    const emnapi_async_worker_create = wasmInstance.exports.emnapi_async_worker_create as (directlySpawn: number, globalAddress: number) => number
    const args = [] as number[]
    emnapiAWMT.initGlobal()
    for (let i = 0; i < n; ++i) {
      args.push(emnapi_async_worker_create(1, emnapiAWMT.globalAddress))
    }
    const promises = args.map(index => {
      if (index === 0) {
        return Promise.reject(new Error('Failed to create async worker'))
      }
      let worker: any
      if (index < 0) {
        worker = emnapiAWMT.pool[-index - 1]
        if (worker) return worker.whenLoaded
      }
      from64('index')

      const view = new DataView(wasmMemory.buffer)
      const tidOffset = 20
      const tid = view.getInt32(index + tidOffset, true)
      worker = PThread.pthreads[tid]
      return worker.whenLoaded!
    })
    emnapiAWMT.workerReady = Promise.all(promises) as any
    return emnapiAWMT.workerReady as Promise<any>
  },
  getResource (work: number): number {
    return makeGetValue('work', 'emnapiAWMT.offset.resource', '*')
  },
  getExecute (work: number): number {
    return makeGetValue('work', 'emnapiAWMT.offset.execute', '*')
  },
  getComplete (work: number): number {
    return makeGetValue('work', 'emnapiAWMT.offset.complete', '*')
  },
  getEnv (work: number): number {
    return makeGetValue('work', 'emnapiAWMT.offset.env', '*')
  },
  getData (work: number): number {
    return makeGetValue('work', 'emnapiAWMT.offset.data', '*')
  },
  getMutex () {
    const index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.mutex
    const mutex = {
      lock () {
        const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
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
      unlock () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
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
      }
    }
    return mutex
  },
  getCond () {
    const index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.cond
    const mutex = emnapiAWMT.getMutex()
    const cond = {
      wait () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        const value = Atomics.load(i32a, 0)
        mutex.unlock()
        Atomics.wait(i32a, 0, value)
        mutex.lock()
      },
      signal () {
        const i32a = new Int32Array(wasmMemory.buffer, index, 1)
        Atomics.add(i32a, 0, 1)
        Atomics.notify(i32a, 0, 1)
      }
    }
    return cond
  },
  queueInit (q: number) {
    makeSetValue('q', 0, 'q', '*')
    makeSetValue('q', POINTER_SIZE, 'q', '*')
  },
  queueInsertTail (h: number, q: number): void {
    makeSetValue('q', 0, 'h', '*')
    const tempValue = makeGetValue('h', POINTER_SIZE, '*')
    makeSetValue('q', POINTER_SIZE, 'tempValue', '*')
    const qprev = makeGetValue('q', POINTER_SIZE, '*')
    makeSetValue('qprev', 0, 'q', '*')
    makeSetValue('h', POINTER_SIZE, 'q', '*')
  },
  queueRemove (q: number): void {
    const qprev = makeGetValue('q', POINTER_SIZE, '*')
    const qnext = makeGetValue('q', 0, '*')
    makeSetValue('qprev', 0, 'qnext', '*')
    makeSetValue('qnext', POINTER_SIZE, 'qprev', '*')
  },
  queueEmpty (q: number): boolean {
    // eslint-disable-next-line eqeqeq
    return q == makeGetValue('q', 0, '*')
  },
  scheduleWork: function (work: number) {
    if (!emnapiAWMT.workerReady?.ready) {
      emnapiAWMT.initWorkers(_emnapi_async_work_pool_size()).then(() => {
        emnapiAWMT.workerReady!.ready = true
      }).catch((err) => {
        emnapiAWMT.workerReady = null
        throw err
      })
    }

    _emnapi_runtime_keepalive_push()
    emnapiCtx.increaseWaitingRequestCounter()
    const statusBuffer = new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1)
    Atomics.store(statusBuffer, 0, AsyncWorkStatus.Pending)

    const mutex = emnapiAWMT.getMutex()
    const cond = emnapiAWMT.getCond()
    mutex.lock()
    try {
      emnapiAWMT.queueInsertTail(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q, work + emnapiAWMT.offset.queue)
    } catch (err) {
      _emnapi_runtime_keepalive_pop()
      emnapiCtx.decreaseWaitingRequestCounter()
      mutex.unlock()
      throw err
    }

    if (makeGetValue('emnapiAWMT.globalAddress', 'emnapiAWMT.globalOffset.idle_threads', 'u32') > 0) {
      cond.signal()
    }
    mutex.unlock()
  },
  cancelWork (work: number) {
    let cancelled = false
    emnapiAWMT.getMutex().execute(() => {
      cancelled = !emnapiAWMT.queueEmpty(work + emnapiAWMT.offset.queue) && makeGetValue('work', 'emnapiAWMT.offset.status', 'i32') !== AsyncWorkStatus.Completed
      if (cancelled) {
        emnapiAWMT.queueRemove(work + emnapiAWMT.offset.queue)
      }
    })
    if (!cancelled) {
      return napi_status.napi_generic_failure
    }
    if (Atomics.compareExchange(new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1), 0, AsyncWorkStatus.Pending, AsyncWorkStatus.Cancelled) !== AsyncWorkStatus.Pending) {
      return napi_status.napi_generic_failure
    }
    emnapiCtx.features.setImmediate(() => {
      emnapiAWMT.callComplete(work, napi_status.napi_cancelled)
    })
    return napi_status.napi_ok
  },
  callComplete: function (work: number, status: napi_status): void {
    _emnapi_runtime_keepalive_pop()
    emnapiCtx.decreaseWaitingRequestCounter()
    const complete = emnapiAWMT.getComplete(work)
    const env = emnapiAWMT.getEnv(work)
    const data = emnapiAWMT.getData(work)
    const envObject = emnapiEnv
    const scope = emnapiCtx.openScope(envObject)
    const callback = (): void => {
      if (!complete) return
      (envObject as NodeEnv).callbackIntoModule(true, () => {
        makeDynCall('vpip', 'complete')(env, status, data)
      })
    }

    try {
      if (emnapiNodeBinding) {
        const resource = emnapiAWMT.getResource(work)
        const resource_value = emnapiCtx.getRef(resource)!.get()
        const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value)!
        const view = new DataView(wasmMemory.buffer)
        const asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true)
        const triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true)
        emnapiNodeBinding.node.makeCallback(resourceObject, callback, [], {
          asyncId,
          triggerAsyncId
        })
      } else {
        callback()
      }
    } finally {
      emnapiCtx.closeScope(envObject, scope)
    }
  }
}

emnapiAWST.init()
emnapiAWMT.init()

/** @__sig ippppppp */
export var napi_create_async_work = singleThreadAsyncWork
  ? function (env: napi_env, resource: napi_value, resource_name: napi_value, execute: number, complete: number, data: number, result: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, execute)
    $CHECK_ARG!(envObject, result)

    let resourceObject: any
    if (resource) {
      resourceObject = Object(emnapiCtx.jsValueFromNapiValue(resource)!)
    } else {
      resourceObject = {}
    }

    $CHECK_ARG!(envObject, resource_name)

    const resourceName = String(emnapiCtx.jsValueFromNapiValue(resource_name)!)

    const id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data)
    from64('result')
    makeSetValue('result', 0, 'id', '*')
    return envObject.clearLastError()
  }
  : function (env: napi_env, resource: napi_value, resource_name: napi_value, execute: number, complete: number, data: number, result: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, execute)
    $CHECK_ARG!(envObject, result)

    let resourceObject: any
    if (resource) {
      resourceObject = Object(emnapiCtx.jsValueFromNapiValue(resource)!)
    } else {
      resourceObject = {}
    }

    $CHECK_ARG!(envObject, resource_name)

    const sizeofAW = emnapiAWMT.offset.end
    let aw = _malloc(to64('sizeofAW') as size_t) as number
    if (!aw) return envObject.setLastError(napi_status.napi_generic_failure)
    from64('aw')
    new Uint8Array(wasmMemory.buffer).subarray(aw as number, aw as number + sizeofAW).fill(0)
    const s = emnapiCtx.napiValueFromJsValue(resourceObject)
    const resourceRef = emnapiCtx.createReference(envObject, s, 1, ReferenceOwnership.kUserland as any)

    const resource_ = resourceRef.id
    makeSetValue('aw', 0, 'resource_', '*')
    _emnapi_node_emit_async_init(s, resource_name, -1, aw as number + emnapiAWMT.offset.async_id)
    makeSetValue('aw', 'emnapiAWMT.offset.env', 'env', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.execute', 'execute', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.complete', 'complete', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.data', 'data', '*')
    emnapiAWMT.queueInit(aw + emnapiAWMT.offset.queue)
    from64('result')
    makeSetValue('result', 0, 'aw', '*')
    return envObject.clearLastError()
  }

/** @__sig ipp */
export var napi_delete_async_work = singleThreadAsyncWork
  ? function (env: napi_env, work: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, work)
    from64('work')
    emnapiAWST.remove(work)
    return envObject.clearLastError()
  }
  : function (env: napi_env, work: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, work)
    from64('work')
    const resource = emnapiAWMT.getResource(work)
    emnapiCtx.getRef(resource)!.dispose()

    if (emnapiNodeBinding) {
      const view = new DataView(wasmMemory.buffer)
      const asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true)
      const triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true)
      _emnapi_node_emit_async_destroy(asyncId, triggerAsyncId)
    }

    _free(to64('work') as number)
    return envObject.clearLastError()
  }

/** @__sig ipp */
export var napi_queue_async_work = singleThreadAsyncWork
  ? function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiEnv
    $CHECK_ARG!(envObject, work)
    from64('work')
    emnapiAWST.queue(work)
    return envObject.clearLastError()
  }
  : function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiEnv
    $CHECK_ARG!(envObject, work)
    from64('work')
    emnapiAWMT.scheduleWork(work)
    return envObject.clearLastError()
  }

/** @__sig ipp */
export var napi_cancel_async_work = singleThreadAsyncWork
  ? function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiEnv
    $CHECK_ARG!(envObject, work)
    from64('work')
    const status = emnapiAWST.cancel(work)
    if (status === napi_status.napi_ok) return envObject.clearLastError()
    return envObject.setLastError(status)
  }
  : function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiEnv
    $CHECK_ARG!(envObject, work)
    from64('work')
    const status = emnapiAWMT.cancelWork(work)
    if (status === napi_status.napi_ok) return envObject.clearLastError()
    return envObject.setLastError(status)
  }

/** @__sig pp */
export function _emnapi_async_worker (globalAddress: number): number {
  from64('globalAddress')
  emnapiAWMT.globalAddress = globalAddress
  const mutex = emnapiAWMT.getMutex()
  const cond = emnapiAWMT.getCond()
  mutex.lock()
  const exitMessageAddr = globalAddress + emnapiAWMT.globalOffset.exit_message
  const idleThreadsAddr = globalAddress + emnapiAWMT.globalOffset.idle_threads
  const workerQueueAddr = globalAddress + emnapiAWMT.globalOffset.q
  for (;;) {
    while (emnapiAWMT.queueEmpty(workerQueueAddr)) {
      Atomics.add(new Int32Array(wasmMemory.buffer, idleThreadsAddr, 1), 0, 1)
      cond.wait()
      Atomics.sub(new Int32Array(wasmMemory.buffer, idleThreadsAddr, 1), 0, 1)
    }
    const q = makeGetValue('workerQueueAddr', 0, '*')
    if (q === exitMessageAddr) {
      cond.signal()
      mutex.unlock()
      break
    }
    const work = q - emnapiAWMT.offset.queue
    emnapiAWMT.queueRemove(q)
    emnapiAWMT.queueInit(q)

    mutex.unlock()

    const statusBuffer = new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1)
    if (Atomics.load(statusBuffer, 0) === AsyncWorkStatus.Cancelled) {
      abort('unreachable')
    }

    const execute = emnapiAWMT.getExecute(work)
    const env = emnapiAWMT.getEnv(work)
    const data = emnapiAWMT.getData(work)
    makeDynCall('vpp', 'execute')(env, data)
    Atomics.store(statusBuffer, 0, AsyncWorkStatus.Completed)
    const postMessage = napiModule.postMessage!
    postMessage({
      __emnapi__: {
        type: 'async-work-complete',
        payload: { work }
      }
    })

    mutex.lock()
  }
  return to64('0') as number
}

/** @__sig ipp */
export function _emnapi_spawn_worker (f: number, globalAddress: number): number {
  if (typeof onCreateWorker !== 'function') {
    throw new TypeError('`options.onCreateWorker` is not a function')
  }
  const promises = [] as Array<Promise<void>>
  const args = [] as number[]
  if (!('emnapi_async_worker_create' in wasmInstance.exports)) {
    throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags')
  }
  args.push((wasmInstance.exports.emnapi_async_worker_create as (directlySpawn: number, globalAddress: number) => number)(0, 0))
  const handleError = (e: Event | Error): void => {
    if ('message' in e && (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1)) {
      emnapiAWMT.terminateWorkers()
    }
  }
  let ret: number
  try {
    const worker = onCreateWorker({ type: 'async-work', name: 'emnapi-async-worker' })
    const p = PThread.loadWasmModuleToWorker(worker)
    if (ENVIRONMENT_IS_NODE) {
      worker.on('error', handleError)
    } else {
      worker.addEventListener('error', handleError, false)
    }
    emnapiAWMT.addListener(worker)
    if (typeof emnapiPluginCtx.emnapiTSFN !== 'undefined') {
      emnapiPluginCtx.emnapiTSFN.addListener(worker)
    }
    promises.push(p.then(() => {
      if (typeof worker.unref === 'function') {
        worker.unref()
      }
    }))
    ret = emnapiAWMT.pool.push(worker) - 1
    const arg = args[0]
    worker.threadBlockBase = arg
    worker.postMessage({
      __emnapi__: {
        type: 'async-worker-init',
        payload: { arg, func: [f, globalAddress] }
      }
    })
  } catch (err) {
    const arg = args[0]
    _free(to64('arg'))
    throw err
  }
  return ret
}

function initWorker (startArg: number, func: [number, number]): void {
  if (napiModule.childThread) {
    if (typeof wasmInstance.exports.emnapi_async_worker_init !== 'function') {
      throw new TypeError('`emnapi_async_worker_init` is not exported, please try to add `--export=emnapi_async_worker_init` to linker flags')
    }
    ;(wasmInstance.exports.emnapi_async_worker_init as (startArg: number) => void)(startArg)

    makeDynCall('pp', 'func[0]')(func[1])
  } else {
    throw new Error('startThread is only available in child threads')
  }
}
napiModule.initWorker = initWorker
