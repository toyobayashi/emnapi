function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (envObject.instanceData) {
      emnapi.RefBase.doDelete(envObject.instanceData)
    }
    envObject.instanceData = new emnapi.RefBase(envObject, 0, true, finalize_cb, data, finalize_hint)
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (env: napi_env, data: void_pp): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [data], () => {
      setValue(Number(data), envObject.instanceData ? envObject.instanceData.data() : 0, '*')
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_set_instance_data', napi_set_instance_data)
emnapiImplement('napi_get_instance_data', napi_get_instance_data)
