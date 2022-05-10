// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, compilerTimeFunction: Function, deps?: string[]): void {
  mergeInto(LibraryManager.library, {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapi', '$emnapiInit']).concat(deps ?? [])
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_clear_last_error (env: napi_env): napi_status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status

mergeInto(LibraryManager.library, {
  napi_set_last_error: function (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p) {
    const envObject = emnapi.envStore.get(env)!
    return envObject.setLastError(error_code, engine_error_code, engine_reserved)
  },
  napi_set_last_error__deps: ['$emnapi'],

  napi_clear_last_error: function (env: napi_env) {
    const envObject = emnapi.envStore.get(env)!
    return envObject.clearLastError()
  },
  napi_clear_last_error__deps: ['$emnapi']
})
