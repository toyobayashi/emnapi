mergeInto(LibraryManager.library, {
  _emnapi_set_timeout__deps: ['$emnapiGetDynamicCalls'],
  _emnapi_set_timeout: function (callback: number, data: number, delay: number): number {
    return setTimeout(() => {
      $from64('callback')
      emnapiGetDynamicCalls.call_vp(callback, data)
    }, delay)
  }
})

function _emnapi_call_into_module (env: napi_env, callback: number, data: number): void {
  const envObject = emnapi.envStore.get(env)!
  const scope = emnapi.openScope(envObject, emnapi.HandleScope)
  try {
    envObject.callIntoModule((_envObject) => {
      $from64('callback')
      emnapiGetDynamicCalls.call_vpp(callback, env, data)
    })
  } catch (err) {
    emnapi.closeScope(envObject, scope)
    throw err
  }
  emnapi.closeScope(envObject, scope)
}

function _emnapi_tsfn_dispatch_one_js (env: number, ref: number, call_js_cb: number, context: number, data: number): void {
  const envObject = emnapi.envStore.get(env)!
  const reference = emnapi.refStore.get(ref)
  const scope = emnapi.openScope(envObject, emnapi.HandleScope)
  try {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/prefer-nullish-coalescing
    const jsCallback = (reference && reference.get()) || 0
    envObject.callIntoModule((_envObject) => {
      $from64('call_js_cb')
      emnapiGetDynamicCalls.call_vpppp(call_js_cb, env, jsCallback, context, data)
    })
  } catch (err) {
    emnapi.closeScope(envObject, scope)
    throw err
  }
  emnapi.closeScope(envObject, scope)
}

emnapiImplement('_emnapi_call_into_module', _emnapi_call_into_module, ['$emnapiGetDynamicCalls'])
emnapiImplement('_emnapi_tsfn_dispatch_one_js', _emnapi_tsfn_dispatch_one_js, ['$emnapiGetDynamicCalls'])
