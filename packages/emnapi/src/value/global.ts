import { emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG } from '../macro'

/** @__sig ipip */
export function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const v = value === 0 ? Constant.FALSE : Constant.TRUE
  makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_global (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const value = Constant.GLOBAL
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_null (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const value = Constant.NULL
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  const value = Constant.UNDEFINED
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}
