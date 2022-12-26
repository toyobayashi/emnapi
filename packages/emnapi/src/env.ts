function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    if (envObject.instanceData) {
      envObject.instanceData.dispose()
    }
    envObject.instanceData = new emnapiRt.RefBase(envObject, 0, emnapiRt.Ownership.kRuntime, finalize_cb, data, finalize_hint)
    return envObject.clearLastError()
  })
}

function napi_get_instance_data (env: napi_env, data: void_pp): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [data], () => {
      $from64('data')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.instanceData ? envObject.instanceData.data() : 0
      $makeSetValue('data', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_set_instance_data', 'ipppp', napi_set_instance_data)
emnapiImplement('napi_get_instance_data', 'ipp', napi_get_instance_data)
