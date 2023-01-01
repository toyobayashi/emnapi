function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = value === 0 ? emnapiRt.HandleStore.ID_FALSE : emnapiRt.HandleStore.ID_TRUE
  $makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiRt.HandleStore.ID_GLOBAL
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiRt.HandleStore.ID_NULL
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiRt.HandleStore.ID_UNDEFINED
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

emnapiImplement('napi_get_boolean', 'ipip', napi_get_boolean)
emnapiImplement('napi_get_global', 'ipp', napi_get_global)
emnapiImplement('napi_get_null', 'ipp', napi_get_null)
emnapiImplement('napi_get_undefined', 'ipp', napi_get_undefined)
