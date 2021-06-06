function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  envObject.instanceData.data = data
  envObject.instanceData.finalize_cb = finalize_cb
  envObject.instanceData.finalize_hint = finalize_hint
  return emnapi.napi_clear_last_error(env)
}

function napi_get_instance_data (env: napi_env, data: void_pp): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (data === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  HEAP32[data >> 2] = envObject.instanceData.data
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_set_instance_data', napi_set_instance_data)
emnapiImplement('napi_get_instance_data', napi_get_instance_data)
