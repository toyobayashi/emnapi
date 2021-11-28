// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, compilerTimeFunction: Function, deps?: string[]): void {
  mergeInto(LibraryManager.library, {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapi']).concat(deps ?? [])
  })
}

mergeInto(LibraryManager.library, {
  napi_set_last_error: function (env: napi_env, error_code: emnapi.napi_status, engine_error_code: uint32_t, engine_reserved: void_p) {
    return emnapi.napi_set_last_error(env, error_code, engine_error_code, engine_reserved)
  },
  napi_set_last_error__deps: ['$emnapi'],

  napi_clear_last_error: function (env: napi_env) {
    return emnapi.napi_clear_last_error(env)
  },
  napi_clear_last_error__deps: ['$emnapi']
})
