/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-unreachable */

declare const PThread: any
declare const emnapiAsyncWorkerQueue: number[]
// declare function __emnapi_execute_async_work (work: number): void

mergeInto(LibraryManager.library, {
  $emnapiAsyncWorkerQueue: [],
  $emnapiAsyncWorkerQueue__deps: ['$PThread', '_emnapi_execute_async_work'],
  $emnapiAsyncWorkerQueue__postset: 'PThread.unusedWorkers.push=function(){' +
    'var r=Array.prototype.push.apply(this,arguments);' +
    'setTimeout(function(){' +
      'if(PThread.unusedWorkers.length>0&&emnapiAsyncWorkerQueue.length>0){' +
        '__emnapi_execute_async_work(emnapiAsyncWorkerQueue.shift());' +
      '}' +
    '});' +
    'return r;' +
  '};',

  _emnapi_get_worker_count_js__deps: ['$PThread'],
  _emnapi_get_worker_count_js: function (struct: number) {
    const address = struct >> 2
    HEAP32[address] = PThread.unusedWorkers.length
    HEAP32[address + 1] = PThread.runningWorkers.length
  },

  // _emnapi_delete_async_work_js: function (_work: number) {}

  _emnapi_on_execute_async_work_js: function (work: number) {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({ emnapiAsyncWorkPtr: work })
    }
  }
})

function _emnapi_queue_async_work_js (work: number): void {
  const tid = HEAP32[(work + 16) >> 2]
  if (tid === 0) {
    emnapiAsyncWorkerQueue.push(work)
    return
  }
  const worker = PThread.pthreads[tid].worker
  if (!worker._emnapiAsyncWorkListener) {
    worker._emnapiAsyncWorkListener = function (this: Worker, e: MessageEvent<any>): any {
      const data = ENVIRONMENT_IS_NODE ? e : e.data
      const w: number = data.emnapiAsyncWorkPtr
      if (w) {
        const env = HEAP32[w >> 2]
        HEAP32[(w + 16) >> 2] = 0 // tid
        const complete = HEAP32[(w + 8) >> 2]
        if (complete !== NULL) {
          const envObject = emnapi.envStore.get(env)!
          const scope = envObject.openScope(emnapi.HandleScope)
          try {
            envObject.callIntoModule((_envObject) => {
              emnapiGetDynamicCalls.call_viii(complete, env, napi_status.napi_ok, HEAP32[(w + 12) >> 2])
            })
          } catch (err) {
            envObject.closeScope(scope)
            throw err
          }
          envObject.closeScope(scope)
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
      const tid = HEAP32[(work + 16) >> 2]
      const workQueueIndex = emnapiAsyncWorkerQueue.indexOf(work)
      if (tid !== 0 || workQueueIndex === -1) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }

      emnapiAsyncWorkerQueue.splice(workQueueIndex, 1)
      const complete = HEAP32[(work + 8) >> 2]
      if (complete !== NULL) {
        setTimeout(() => {
          const envObject = emnapi.envStore.get(env)!
          const scope = envObject.openScope(emnapi.HandleScope)
          try {
            envObject.callIntoModule((_envObject) => {
              emnapiGetDynamicCalls.call_viii(complete, env, napi_status.napi_cancelled, HEAP32[(work + 12) >> 2])
            })
          } catch (err) {
            envObject.closeScope(scope)
            throw err
          }
          envObject.closeScope(scope)
        })
      }

      return envObject.clearLastError()
    })
  })
// #else
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
}

emnapiImplement('_emnapi_queue_async_work_js', _emnapi_queue_async_work_js, ['$PThread', '$emnapiAsyncWorkerQueue', '$emnapiGetDynamicCalls'])
emnapiImplement('napi_cancel_async_work', napi_cancel_async_work, ['$emnapiAsyncWorkerQueue', '$emnapiGetDynamicCalls'])
