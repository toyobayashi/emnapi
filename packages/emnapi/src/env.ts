function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (envObject.instanceData) {
      if (envObject.instanceData.finalize_cb) {
        emnapiGetDynamicCalls.call_viii(envObject.instanceData.finalize_cb, env, envObject.instanceData.data, envObject.instanceData.finalize_hint)
      }
    }
    envObject.instanceData = {
      data,
      finalize_cb,
      finalize_hint
    }
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (env: napi_env, data: void_pp): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [data], () => {
      HEAP32[data >> 2] = envObject.instanceData ? envObject.instanceData.data : 0
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_set_instance_data', napi_set_instance_data, ['$emnapiGetDynamicCalls'])
emnapiImplement('napi_get_instance_data', napi_get_instance_data)
