function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    envObject.instanceData.data = data
    envObject.instanceData.finalize_cb = finalize_cb
    envObject.instanceData.finalize_hint = finalize_hint
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (env: napi_env, data: void_pp): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [data], () => {
      HEAP32[data >> 2] = envObject.instanceData.data
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_set_instance_data', napi_set_instance_data)
emnapiImplement('napi_get_instance_data', napi_get_instance_data)
