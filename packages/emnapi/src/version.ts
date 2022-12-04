function napi_get_version (env: napi_env, result: Pointer<int32_t>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('result')
      HEAPU32[result >> 2] = 8
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_get_version', 'ipp', napi_get_version)
