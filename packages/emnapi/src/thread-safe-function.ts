function __emnapi_call_finalizer (env: napi_env, callback: number, data: number, hint: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  $from64('callback')
  envObject.callFinalizer(callback, data, hint)
}

emnapiImplementInternal('_emnapi_call_finalizer', 'vpppp', __emnapi_call_finalizer)
