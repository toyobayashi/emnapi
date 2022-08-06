function napi_get_version (env: napi_env, result: Pointer<int32_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU32[result >> 2] = 8
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_get_version', napi_get_version)
