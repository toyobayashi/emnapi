function napi_run_script (env: napi_env, script: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [script, result], () => {
      const v8Script = envObject.handleStore.get(script)!
      if (!v8Script.isString()) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
      }
      const g: typeof globalThis = envObject.handleStore.get(emnapi.HandleStore.ID_GLOBAL)!.value
      const ret = g.eval(v8Script.value)
      HEAP32[result >> 2] = envObject.ensureHandleId(ret)
      return emnapi.getReturnStatus(env)
    })
  })
}

emnapiImplement('napi_run_script', napi_run_script)
