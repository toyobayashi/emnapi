function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      if (value === 0) {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_FALSE
      } else {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_TRUE
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_GLOBAL
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_NULL
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_UNDEFINED
      return emnapi.napi_clear_last_error(env)
    })
  })
}

emnapiImplement('napi_get_boolean', napi_get_boolean)
emnapiImplement('napi_get_global', napi_get_global)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_undefined', napi_get_undefined)
