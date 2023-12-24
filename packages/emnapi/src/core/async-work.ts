import { emnapiCtx, onCreateWorker, napiModule, emnapiNodeBinding, singleThreadAsyncWork, _emnapi_async_work_pool_size } from 'emnapi:shared'
import { PThread, ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD, wasmInstance, _free, wasmMemory, _malloc } from 'emscripten:runtime'
import { POINTER_SIZE, to64, makeDynCall, makeSetValue, from64 } from 'emscripten:parse-tools'
import { emnapiAWST } from '../async-work'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG, $CHECK_ENV } from '../macro'
import { _emnapi_node_emit_async_init, _emnapi_node_emit_async_destroy } from '../node'
import { emnapiTSFN } from '../threadsafe-function'
import { _emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push } from '../util'

var emnapiAWMT = {
  unusedWorkers: [] as any[],
  runningWorkers: [] as any[],
  workQueue: [] as number[],
  workerReady: null as (Promise<any> & { ready: boolean }) | null,
  offset: {
    /* napi_ref */ resource: 0,
    /* double */ async_id: 8,
    /* double */ trigger_async_id: 16,
    /* napi_env */ env: 24,
    /* void* */ data: 1 * POINTER_SIZE + 24,
    /* napi_async_execute_callback */ execute: 2 * POINTER_SIZE + 24,
    /* napi_async_complete_callback */ complete: 3 * POINTER_SIZE + 24,
    end: 4 * POINTER_SIZE + 24
  },
  init () {
    emnapiAWMT.unusedWorkers = []
    emnapiAWMT.runningWorkers = []
    emnapiAWMT.workQueue = []
    emnapiAWMT.workerReady = null
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
          _emnapi_runtime_keepalive_pop()
          emnapiCtx.decreaseWaitingRequestCounter()
          emnapiAWMT.runningWorkers.splice(emnapiAWMT.runningWorkers.indexOf(worker), 1)
          emnapiAWMT.unusedWorkers.push(worker)
          emnapiAWMT.checkIdleWorker()
          emnapiAWMT.callComplete(payload.work, napi_status.napi_ok)
        } else if (type === 'async-work-queue') {
          emnapiAWMT.scheduleWork(payload.work)
        } else if (type === 'async-work-cancel') {
          emnapiAWMT.cancelWork(payload.work)
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
  initWorkers (n: number): Promise<any> {
    if (ENVIRONMENT_IS_PTHREAD) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      return emnapiAWMT.workerReady || (emnapiAWMT.workerReady = Promise.resolve() as any)
    }
    if (emnapiAWMT.workerReady) return emnapiAWMT.workerReady
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not a function')
    }
    const promises = [] as Array<Promise<void>>
    const args = [] as number[]
    if (!('emnapi_async_worker_create' in wasmInstance.exports)) {
      throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags')
    }
    for (let i = 0; i < n; ++i) {
      args.push((wasmInstance.exports.emnapi_async_worker_create as () => number)())
    }
    try {
      for (let i = 0; i < n; ++i) {
        const worker = onCreateWorker({ type: 'async-work' })
        const p = PThread.loadWasmModuleToWorker(worker)
        emnapiAWMT.addListener(worker)
        promises.push(p.then(() => {
          if (typeof worker.unref === 'function') {
            worker.unref()
          }
        }))
        emnapiAWMT.unusedWorkers.push(worker)
        const arg = args[i]
        worker.threadBlockBase = arg
        worker.postMessage({
          __emnapi__: {
            type: 'async-worker-init',
            payload: { arg }
          }
        })
      }
    } catch (err) {
      for (let i = 0; i < n; ++i) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const arg = args[i]
        _free(to64('arg'))
      }
      throw err
    }
    emnapiAWMT.workerReady = Promise.all(promises) as any
    return emnapiAWMT.workerReady as Promise<any>
  },
  checkIdleWorker () {
    if (emnapiAWMT.unusedWorkers.length > 0 && emnapiAWMT.workQueue.length > 0) {
      const worker = emnapiAWMT.unusedWorkers.shift()!
      const work = emnapiAWMT.workQueue.shift()!
      emnapiAWMT.runningWorkers.push(worker)
      worker.postMessage({
        __emnapi__: {
          type: 'async-work-execute',
          payload: { work }
        }
      })
    }
  },
  getResource (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.resource, false)
  },
  getExecute (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.execute, false)
  },
  getComplete (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.complete, false)
  },
  getEnv (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.env, false)
  },
  getData (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.data, false)
  },
  scheduleWork: function (work: number) {
    if (ENVIRONMENT_IS_PTHREAD) {
      const postMessage = napiModule.postMessage!
      postMessage({
        __emnapi__: {
          type: 'async-work-queue',
          payload: { work }
        }
      })
      return
    }
    _emnapi_runtime_keepalive_push()
    emnapiCtx.increaseWaitingRequestCounter()
    emnapiAWMT.workQueue.push(work)
    if (emnapiAWMT.workerReady?.ready) {
      emnapiAWMT.checkIdleWorker()
    } else {
      const fail = (err: any): void => {
        _emnapi_runtime_keepalive_pop()
        emnapiCtx.decreaseWaitingRequestCounter()
        throw err
      }
      try {
        emnapiAWMT.initWorkers(_emnapi_async_work_pool_size()).then(() => {
          emnapiAWMT.workerReady!.ready = true
          emnapiAWMT.checkIdleWorker()
        }, fail)
      } catch (err) {
        fail(err)
      }
    }
  },
  cancelWork (work: number) {
    if (ENVIRONMENT_IS_PTHREAD) {
      const postMessage = napiModule.postMessage!
      postMessage({
        __emnapi__: {
          type: 'async-work-cancel',
          payload: { work }
        }
      })
      return napi_status.napi_ok
    }
    const index = emnapiAWMT.workQueue.indexOf(work)
    if (index !== -1) {
      emnapiAWMT.workQueue.splice(index, 1)

      emnapiCtx.feature.setImmediate(() => {
        _emnapi_runtime_keepalive_pop()
        emnapiCtx.decreaseWaitingRequestCounter()
        emnapiAWMT.checkIdleWorker()
        emnapiAWMT.callComplete(work, napi_status.napi_cancelled)
      })

      return napi_status.napi_ok
    }
    return napi_status.napi_generic_failure
  },
  callComplete: function (work: number, status: napi_status): void {
    const complete = emnapiAWMT.getComplete(work)
    const env = emnapiAWMT.getEnv(work)
    const data = emnapiAWMT.getData(work)
    const envObject = emnapiCtx.envStore.get(env)!
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
        const resource_value = emnapiCtx.refStore.get(resource)!.get()
        const resourceObject = emnapiCtx.handleStore.get(resource_value)!.value
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

/** @__sig ippppppp */
export var napi_create_async_work = singleThreadAsyncWork
  ? function (env: napi_env, resource: napi_value, resource_name: napi_value, execute: number, complete: number, data: number, result: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, execute)
    $CHECK_ARG!(envObject, result)

    let resourceObject: any
    if (resource) {
      resourceObject = Object(emnapiCtx.handleStore.get(resource)!.value)
    } else {
      resourceObject = {}
    }

    $CHECK_ARG!(envObject, resource_name)

    const resourceName = String(emnapiCtx.handleStore.get(resource_name)!.value)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data)
    makeSetValue('result', 0, 'id', '*')
    return envObject.clearLastError()
  }
  : function (env: napi_env, resource: napi_value, resource_name: napi_value, execute: number, complete: number, data: number, result: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, execute)
    $CHECK_ARG!(envObject, result)

    let resourceObject: any
    if (resource) {
      resourceObject = Object(emnapiCtx.handleStore.get(resource)!.value)
    } else {
      resourceObject = {}
    }

    $CHECK_ARG!(envObject, resource_name)

    const sizeofAW = emnapiAWMT.offset.end
    const aw = _malloc(to64('sizeofAW'))
    if (!aw) return envObject.setLastError(napi_status.napi_generic_failure)
    new Uint8Array(wasmMemory.buffer).subarray(aw, aw + sizeofAW).fill(0)
    const s = envObject.ensureHandleId(resourceObject)
    const resourceRef = emnapiCtx.createReference(envObject, s, 1, Ownership.kUserland as any)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const resource_ = resourceRef.id
    makeSetValue('aw', 0, 'resource_', '*')
    _emnapi_node_emit_async_init(s, resource_name, -1, aw + emnapiAWMT.offset.async_id)
    makeSetValue('aw', 'emnapiAWMT.offset.env', 'env', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.execute', 'execute', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.complete', 'complete', '*')
    makeSetValue('aw', 'emnapiAWMT.offset.data', 'data', '*')
    from64('result')
    makeSetValue('result', 0, 'aw', '*')
    return envObject.clearLastError()
  }

/** @__sig ipp */
export var napi_delete_async_work = singleThreadAsyncWork
  ? function (env: napi_env, work: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, work)

    emnapiAWST.remove(work)
    return envObject.clearLastError()
  }
  : function (env: napi_env, work: number): napi_status {
    const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
    $CHECK_ARG!(envObject, work)

    const resource = emnapiAWMT.getResource(work)
    emnapiCtx.refStore.get(resource)!.dispose()

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
    const envObject = emnapiCtx.envStore.get(env)!
    $CHECK_ARG!(envObject, work)

    emnapiAWST.queue(work)
    return envObject.clearLastError()
  }
  : function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiCtx.envStore.get(env)!
    $CHECK_ARG!(envObject, work)

    emnapiAWMT.scheduleWork(work)
    return envObject.clearLastError()
  }

/** @__sig ipp */
export var napi_cancel_async_work = singleThreadAsyncWork
  ? function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiCtx.envStore.get(env)!
    $CHECK_ARG!(envObject, work)

    const status = emnapiAWST.cancel(work)
    if (status === napi_status.napi_ok) return envObject.clearLastError()
    return envObject.setLastError(status)
  }
  : function (env: napi_env, work: number): napi_status {
    $CHECK_ENV!(env)
    const envObject = emnapiCtx.envStore.get(env)!
    $CHECK_ARG!(envObject, work)

    const status = emnapiAWMT.cancelWork(work)
    if (status === napi_status.napi_ok) return envObject.clearLastError()
    return envObject.setLastError(status)
  }

function initWorker (startArg: number): void {
  if (napiModule.childThread) {
    if (typeof wasmInstance.exports.emnapi_async_worker_init !== 'function') {
      throw new TypeError('`emnapi_async_worker_init` is not exported, please try to add `--export=emnapi_async_worker_init` to linker flags')
    }
    ;(wasmInstance.exports.emnapi_async_worker_init as (startArg: number) => void)(startArg)
  } else {
    throw new Error('startThread is only available in child threads')
  }
}
function executeAsyncWork (work: number): void {
  if (!ENVIRONMENT_IS_PTHREAD) return
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const execute = emnapiAWMT.getExecute(work)
  const env = emnapiAWMT.getEnv(work)
  const data = emnapiAWMT.getData(work)
  makeDynCall('vpp', 'execute')(env, data)
  const postMessage = napiModule.postMessage!
  postMessage({
    __emnapi__: {
      type: 'async-work-complete',
      payload: { work }
    }
  })
}
napiModule.initWorker = initWorker
napiModule.executeAsyncWork = executeAsyncWork
