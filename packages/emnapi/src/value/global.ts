function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      if (value === 0) {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_FALSE
      } else {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_TRUE
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_GLOBAL
      return envObject.clearLastError()
    })
  })
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_NULL
      return envObject.clearLastError()
    })
  })
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_UNDEFINED
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_get_boolean', napi_get_boolean)
emnapiImplement('napi_get_global', napi_get_global)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_undefined', napi_get_undefined)
