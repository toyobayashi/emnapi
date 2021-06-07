function napi_get_version (env: napi_env, result: Pointer<int32_t>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!

  HEAPU32[result >> 2] = envObject.napiVersion
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_get_version', napi_get_version)
