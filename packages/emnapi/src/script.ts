/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/indent */

function napi_run_script (env: napi_env, script: napi_value, result: Pointer<napi_value>): napi_status {
// #if DYNAMIC_EXECUTION
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [script, result], () => {
      const v8Script = emnapiCtx.handleStore.get(script)
      if (typeof v8Script !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const g: typeof globalThis = emnapiCtx.handleStore.get(emnapiRt.HandleStore.ID_GLOBAL)
      const ret = g.eval(v8Script)
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.ensureHandleId(ret)
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    })
  })
// #else
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
}

emnapiImplement('napi_run_script', 'ippp', napi_run_script, ['napi_set_last_error'])
