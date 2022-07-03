/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/indent */

function napi_run_script (env: napi_env, script: napi_value, result: Pointer<napi_value>): napi_status {
// #if DYNAMIC_EXECUTION
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [script, result], () => {
      const v8Script = emnapi.handleStore.get(script)!
      if (!v8Script.isString()) {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const g: typeof globalThis = emnapi.handleStore.get(emnapi.HandleStore.ID_GLOBAL)!.value
      const ret = g.eval(v8Script.value)
      HEAP32[result >> 2] = envObject.ensureHandleId(ret)
      return envObject.getReturnStatus()
    })
  })
// #else
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
}

emnapiImplement('napi_run_script', napi_run_script, ['napi_set_last_error'])
