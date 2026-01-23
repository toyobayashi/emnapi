import { emnapiEnv } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ENV, $CHECK_ARG } from './macro'

/** @__sig ipppp */
export function napi_set_instance_data (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiEnv!
  from64('data')
  from64('finalize_cb')
  from64('finalize_hint')
  envObject.setInstanceData(data as number, finalize_cb as number, finalize_hint as number)
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_instance_data (env: napi_env, data: void_pp): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiEnv!
  $CHECK_ARG!(envObject, data)
  from64('data')

  const value = envObject.getInstanceData()
  makeSetValue('data', 0, 'value', '*')
  return envObject.clearLastError()
}
