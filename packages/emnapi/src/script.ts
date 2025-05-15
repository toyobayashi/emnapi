/* eslint-disable @stylistic/indent */

import { emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ARG, $PREAMBLE } from './macro'
import { napi_set_last_error } from './util'

/** @__sig ippp */
export function napi_run_script (env: napi_env, script: napi_value, result: Pointer<napi_value>): napi_status {
  let status: napi_status
// #if DYNAMIC_EXECUTION
  let value: napi_value
  // @ts-expect-error
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, script)
    $CHECK_ARG!(envObject, result)
    const v8Script = emnapiCtx.jsValueFromNapiValue(script)!
    if (typeof v8Script !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    const g = emnapiCtx.jsValueFromNapiValue<typeof globalThis>(GlobalHandle.GLOBAL)!
    const ret = g.eval(v8Script)
    from64('result')

    value = emnapiCtx.napiValueFromJsValue(ret)
    makeSetValue('result', 0, 'value', '*')
    status = envObject.getReturnStatus()
  })
// #else
  status = napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
// #endif
  return status
}
