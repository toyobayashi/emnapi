import { emnapiCtx } from 'emnapi:shared'
import { makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ENV, $CHECK_ARG } from './macro'

/** @__sig ipp */
export function napi_get_version (env: napi_env, result: Pointer<uint32_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX
  makeSetValue('result', 0, 'NODE_API_SUPPORTED_VERSION_MAX', 'u32')
  return envObject.clearLastError()
}
