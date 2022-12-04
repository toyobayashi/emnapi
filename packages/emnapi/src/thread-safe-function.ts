function _emnapi_call_into_module (env: napi_env, callback: number, data: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  const scope = emnapiCtx.openScope(envObject, emnapiRt.HandleScope)
  try {
    envObject.callIntoModule((_envObject) => {
      $from64('callback')
      emnapiGetDynamicCalls.call_vpp(callback, env, data)
    })
  } catch (err) {
    emnapiCtx.closeScope(envObject, scope)
    throw err
  }
  emnapiCtx.closeScope(envObject, scope)
}

function _emnapi_tsfn_dispatch_one_js (env: number, ref: number, call_js_cb: number, context: number, data: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  const reference = emnapiCtx.refStore.get(ref)
  const scope = emnapiCtx.openScope(envObject, emnapiRt.HandleScope)
  try {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/prefer-nullish-coalescing
    const jsCallback = (reference && reference.get()) || 0
    envObject.callIntoModule((_envObject) => {
      $from64('call_js_cb')
      emnapiGetDynamicCalls.call_vpppp(call_js_cb, env, jsCallback, context, data)
    })
  } catch (err) {
    emnapiCtx.closeScope(envObject, scope)
    throw err
  }
  emnapiCtx.closeScope(envObject, scope)
}

emnapiImplement('_emnapi_call_into_module', 'vpp', _emnapi_call_into_module, ['$emnapiGetDynamicCalls'])
emnapiImplement('_emnapi_tsfn_dispatch_one_js', 'vppppp', _emnapi_tsfn_dispatch_one_js, ['$emnapiGetDynamicCalls'])
