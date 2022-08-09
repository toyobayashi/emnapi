function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = value === 0 ? emnapi.HandleStore.ID_FALSE : emnapi.HandleStore.ID_TRUE
      $makeSetValue('result', 0, 'v', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapi.HandleStore.ID_GLOBAL
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapi.HandleStore.ID_NULL
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapi.HandleStore.ID_UNDEFINED
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_get_boolean', napi_get_boolean)
emnapiImplement('napi_get_global', napi_get_global)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_undefined', napi_get_undefined)
