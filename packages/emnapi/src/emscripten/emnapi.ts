import { emnapiCtx } from 'emnapi:shared'
import { Module } from 'emscripten:runtime'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { emnapiString } from '../string'
import { $CHECK_ARG, $PREAMBLE } from '../macro'

/**
 * @__sig ipp
 */
export function emnapi_get_module_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('result')

    value = envObject.ensureHandleId(Module)
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ippp
 */
export function emnapi_get_module_property (env: napi_env, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, utf8name)
    $CHECK_ARG!(envObject, result)
    from64('utf8name')
    from64('result')

    value = envObject.ensureHandleId(Module[emnapiString.UTF8ToString(utf8name, -1)])
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}
