mergeInto(LibraryManager.library, {
  $emnapiAddTSFNListener__deps: ['$emnapiGetDynamicCalls'],
  $emnapiAddTSFNListener: function (worker: any) {
    if (!worker._emnapiTSFNListener) {
      worker._emnapiTSFNListener = function _emnapiTSFNListener (e: any) {
        const data = ENVIRONMENT_IS_NODE ? e : e.data
        if (data.emnapiTSFNSend) {
          emnapiGetDynamicCalls.call_vi(data.emnapiTSFNSend.callback, data.emnapiTSFNSend.data)
        }
      }
      if (ENVIRONMENT_IS_NODE) {
        worker.on('message', worker._emnapiTSFNListener)
      } else {
        worker.addEventListener('message', worker._emnapiTSFNListener, false)
      }
    }
  },

  _emnapi_tsfn_send_js__deps: ['$PThread', '$emnapiGetDynamicCalls', '$emnapiAddTSFNListener'],
  _emnapi_tsfn_send_js: function (callback: number, data: number): void {
    if (ENVIRONMENT_IS_PTHREAD) {
      postMessage({
        emnapiTSFNSend: {
          callback,
          data
        }
      })
    } else {
      setTimeout(() => {
        emnapiGetDynamicCalls.call_vi(callback, data)
      })
    }
  },
  _emnapi_tsfn_send_js__postset:
    'PThread.unusedWorkers.forEach(emnapiAddTSFNListener);' +
    'PThread.runningWorkers.forEach(emnapiAddTSFNListener);' +
    'PThread.unusedWorkers.pop = function () {' +
      'var r = Array.prototype.pop.apply(this, arguments);' +
      'emnapiAddTSFNListener(r);' +
      'return r;' +
    '};',

  _emnapi_set_timeout__deps: ['$emnapiGetDynamicCalls'],
  _emnapi_set_timeout: function (callback: number, data: number, delay: number): number {
    return setTimeout(() => {
      emnapiGetDynamicCalls.call_vi(callback, data)
    }, delay)
  }
})

function _emnapi_call_into_module (env: napi_env, callback: number, data: number): void {
  const envObject = emnapi.envStore.get(env)!
  const scope = envObject.openScope(emnapi.HandleScope)
  try {
    envObject.callIntoModule((_envObject) => {
      emnapiGetDynamicCalls.call_vii(callback, env, data)
    })
  } catch (err) {
    envObject.closeScope(scope)
    throw err
  }
  envObject.closeScope(scope)
}

function _emnapi_tsfn_dispatch_one_js (env: number, ref: number, call_js_cb: number, context: number, data: number): void {
  const envObject = emnapi.envStore.get(env)!
  const reference = emnapi.refStore.get(ref)
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/prefer-nullish-coalescing
  const jsCallback = (reference && reference.get()) || 0
  const scope = envObject.openScope(emnapi.HandleScope)
  try {
    envObject.callIntoModule((_envObject) => {
      emnapiGetDynamicCalls.call_viiii(call_js_cb, env, jsCallback, context, data)
    })
  } catch (err) {
    envObject.closeScope(scope)
    throw err
  }
  envObject.closeScope(scope)
}

emnapiImplement('_emnapi_call_into_module', _emnapi_call_into_module, ['$emnapiGetDynamicCalls'])
emnapiImplement('_emnapi_tsfn_dispatch_one_js', _emnapi_tsfn_dispatch_one_js, ['$emnapiGetDynamicCalls'])
