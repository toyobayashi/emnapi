/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-unreachable */

declare const PThread: any
declare let emnapiWorkerPoolSize: number
declare const emnapiAsyncWorkerQueue: number[]
declare const emnapiRunningWorkers: Worker[]
declare function __emnapi_execute_async_work (work: number): void

mergeInto(LibraryManager.library, {
  $emnapiWorkerPoolSize: undefined,
  $emnapiRunningWorkers: [],

  $emnapiOnReturnWorkerToPool__deps: ['$PThread', '_emnapi_execute_async_work', '$emnapiRunningWorkers', '$emnapiWorkerPoolSize'],
  $emnapiOnReturnWorkerToPool: function (worker: Worker) {
    const index = emnapiRunningWorkers.indexOf(worker)
    if (index !== -1) emnapiRunningWorkers.splice(index, 1)
    setTimeout(function () {
      let canExecute = PThread.unusedWorkers.length > 0 && emnapiAsyncWorkerQueue.length > 0
      if (emnapiWorkerPoolSize > 0) {
        canExecute = canExecute && (emnapiWorkerPoolSize - emnapiRunningWorkers.length > 0)
      }
      if (canExecute) {
        __emnapi_execute_async_work(emnapiAsyncWorkerQueue.shift()!)
      }
    })
  },

  $emnapiAsyncWorkerQueue: [],
  $emnapiAsyncWorkerQueue__deps: ['$PThread', '$emnapiOnReturnWorkerToPool'],
  $emnapiAsyncWorkerQueue__postset: 'var __original_returnWorkerToPool = PThread.returnWorkerToPool; PThread.returnWorkerToPool = function (worker) {' +
    'var r = __original_returnWorkerToPool.apply(this, arguments);' +
    'emnapiOnReturnWorkerToPool(worker);' +
    'return r;' +
  '};',

  _emnapi_get_worker_count_js__deps: ['$PThread', '$emnapiWorkerPoolSize', '$emnapiRunningWorkers'],
  _emnapi_get_worker_count_js: function (struct: number) {
    $from64('struct')
    const address = struct >> 2
    HEAP32[address] = PThread.unusedWorkers.length
    HEAP32[address + 1] = PThread.runningWorkers.length
    HEAP32[address + 2] = emnapiWorkerPoolSize - emnapiRunningWorkers.length
  },

  // _emnapi_delete_async_work_js: function (_work: number) {}

  _emnapi_on_execute_async_work_js: function (work: number) {
    if (ENVIRONMENT_IS_PTHREAD) {
      $from64('work')
      postMessage({ emnapiAsyncWorkPtr: work })
    }
  }
})

function _emnapi_queue_async_work_js (work: number): void {
  $from64('work')
  const tid = $makeGetValue('work', POINTER_SIZE * 4, '*')
  if (tid === 0) {
    emnapiAsyncWorkerQueue.push(work)
    return
  }
  const pthreadValue = PThread.pthreads[tid]
  const worker = (('worker' in pthreadValue) && ('threadInfoStruct' in pthreadValue)) ? pthreadValue.worker : pthreadValue
  emnapiRunningWorkers.push(worker)
  if (!worker._emnapiAsyncWorkListener) {
    worker._emnapiAsyncWorkListener = function (this: Worker, e: MessageEvent<any>): any {
      const data = ENVIRONMENT_IS_NODE ? e : e.data
      const w: number = data.emnapiAsyncWorkPtr
      if (w) {
        const env = $makeGetValue('w', 0, '*')
        $makeSetValue('w', POINTER_SIZE * 4, '0', '*') // tid
        const complete = $makeGetValue('w', POINTER_SIZE * 2, '*')
        if (complete) {
          const envObject = emnapi.envStore.get(env)!
          const scope = emnapi.openScope(envObject, emnapi.HandleScope)
          try {
            envObject.callIntoModule((_envObject) => {
              const hint = $makeGetValue('w', POINTER_SIZE * 3, '*')
              emnapiGetDynamicCalls.call_vpip(complete, env, napi_status.napi_ok, hint)
            })
          } catch (err) {
            emnapi.closeScope(envObject, scope)
            throw err
          }
          emnapi.closeScope(envObject, scope)
        }
      }
    }
    if (ENVIRONMENT_IS_NODE) {
      worker.on('message', worker._emnapiAsyncWorkListener)
    } else {
      worker.addEventListener('message', worker._emnapiAsyncWorkListener, false)
    }
  }
}

function napi_cancel_async_work (env: napi_env, work: number): napi_status {
// #if USE_PTHREADS
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [work], () => {
      $from64('work')
      const tid = $makeGetValue('work', POINTER_SIZE * 4, '*')
      const workQueueIndex = emnapiAsyncWorkerQueue.indexOf(work)
      if (tid !== 0 || workQueueIndex === -1) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }

      emnapiAsyncWorkerQueue.splice(workQueueIndex, 1)
      const complete = $makeGetValue('work', POINTER_SIZE * 2, '*')
      if (complete) {
        setTimeout(() => {
          const envObject = emnapi.envStore.get(env)!
          const scope = emnapi.openScope(envObject, emnapi.HandleScope)
          try {
            envObject.callIntoModule((_envObject) => {
              const hint = $makeGetValue('work', POINTER_SIZE * 3, '*')
              emnapiGetDynamicCalls.call_vpip(complete, env, napi_status.napi_cancelled, hint)
            })
          } catch (err) {
            emnapi.closeScope(envObject, scope)
            throw err
          }
          emnapi.closeScope(envObject, scope)
        })
      }

      return envObject.clearLastError()
    })
  })
// #else
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
}

emnapiImplement('_emnapi_queue_async_work_js', _emnapi_queue_async_work_js, ['$PThread', '$emnapiAsyncWorkerQueue', '$emnapiGetDynamicCalls', '$emnapiRunningWorkers'])
emnapiImplement('napi_cancel_async_work', napi_cancel_async_work, ['$emnapiAsyncWorkerQueue', '$emnapiGetDynamicCalls', 'napi_set_last_error'])
