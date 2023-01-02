// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  const sym: any = {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapiInit']).concat(deps ?? [])
  }
  if (sig) {
    sym[name + '__sig'] = sig
  }
  mergeInto(LibraryManager.library, sym)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status

function napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.setLastError(error_code, engine_error_code, engine_reserved)
}

function napi_clear_last_error (env: napi_env): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.clearLastError()
}

emnapiImplement('napi_set_last_error', 'ipiip', napi_set_last_error)
emnapiImplement('napi_clear_last_error', 'ip', napi_clear_last_error)

declare function runtimeKeepalivePush (): void
declare function runtimeKeepalivePop (): void

mergeInto(LibraryManager.library, {
  _emnapi_runtime_keepalive_push__sig: 'v',
  _emnapi_runtime_keepalive_push__deps: ['$runtimeKeepalivePush'],
  _emnapi_runtime_keepalive_push: function () {
    if (typeof runtimeKeepalivePush === 'function') runtimeKeepalivePush()
  },
  _emnapi_runtime_keepalive_pop__sig: 'v',
  _emnapi_runtime_keepalive_pop__deps: ['$runtimeKeepalivePop'],
  _emnapi_runtime_keepalive_pop: function () {
    if (typeof runtimeKeepalivePop === 'function') runtimeKeepalivePop()
  }
})
