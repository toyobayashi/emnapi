function napi_get_version (env: napi_env, result: Pointer<int32_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAPU32[result >> 2] = 8
      return emnapi.napi_clear_last_error(env)
    })
  })
}

emnapiImplement('napi_get_version', napi_get_version)
