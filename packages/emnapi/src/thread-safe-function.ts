function _emnapi_call_finalizer (env: napi_env, callback: number, data: number, hint: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  $from64('callback')
  envObject.callFinalizer(callback, data, hint)
}

emnapiImplement('_emnapi_call_finalizer', 'vpppp', _emnapi_call_finalizer)
