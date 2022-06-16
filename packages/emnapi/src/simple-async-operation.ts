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

  _emnapi_get_unused_worker_size__deps: ['$PThread'],
  _emnapi_get_unused_worker_size: function () {
    return PThread.unusedWorkers.length
  },

  _emnapi_on_execute_async_work_js: function (work: number) {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({ emnapiAsyncWorkPtr: work })
    }
  },

  _emnapi_delete_async_work_js: function (_work: number) {
    // TODO
  }
})

function _emnapi_queue_async_work_js (work: number): void {
  const tid = HEAP32[(work + 20) >> 2]
  if (tid === 0) {
    emnapiAsyncWorkerQueue.push(work)
    return
  }
  const env = HEAP32[work >> 2]
  const worker: Worker = PThread.pthreads[tid].worker
  const listener: (this: Worker, ev: MessageEvent<any>) => any = (e) => {
    const removeListener = (): void => {
      if (ENVIRONMENT_IS_NODE) {
        (worker as any).off('message', listener)
      } else {
        worker.removeEventListener('message', listener, false)
      }
    }
    const data = ENVIRONMENT_IS_NODE ? e : e.data
    if (data.emnapiAsyncWorkPtr === work) {
      HEAP32[(work + 20) >> 2] = 0 // tid
      const complete = HEAP32[(work + 8) >> 2]
      if (complete !== NULL) {
        const envObject = emnapi.envStore.get(env)!
        const scope = envObject.openScope(emnapi.HandleScope)
        try {
          envObject.callIntoModule((envObject) => {
            envObject.call_viii(complete, env, HEAP32[(work + 16) >> 2], HEAP32[(work + 12) >> 2])
          })
        } catch (err) {
          envObject.closeScope(scope)
          removeListener()
          throw err
        }
        envObject.closeScope(scope)
      }
      removeListener()
    }
  }
  if (ENVIRONMENT_IS_NODE) {
    (worker as any).on('message', listener)
  } else {
    worker.addEventListener('message', listener, false)
  }
}

function napi_cancel_async_work (env: napi_env, work: number): napi_status {
// #if USE_PTHREADS
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [work], () => {
      const tid = HEAP32[(work + 20) >> 2]
      if (tid !== 0) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }

      emnapiAsyncWorkerQueue.splice(emnapiAsyncWorkerQueue.indexOf(work), 1)
      HEAP32[(work + 16) >> 2] = napi_status.napi_cancelled
      const complete = HEAP32[(work + 8) >> 2]
      if (complete !== NULL) {
        const envObject = emnapi.envStore.get(env)!
        const scope = envObject.openScope(emnapi.HandleScope)
        try {
          envObject.callIntoModule((envObject) => {
            envObject.call_viii(complete, env, napi_status.napi_cancelled, HEAP32[(work + 12) >> 2])
          })
        } catch (err) {
          envObject.closeScope(scope)
          throw err
        }
        envObject.closeScope(scope)
      }

      return envObject.clearLastError()
    })
  })
// #else
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
}

emnapiImplement('_emnapi_queue_async_work_js', _emnapi_queue_async_work_js, ['$PThread', '$emnapiAsyncWorkerQueue'])
emnapiImplement('napi_cancel_async_work', napi_cancel_async_work, ['$emnapiAsyncWorkerQueue'])
