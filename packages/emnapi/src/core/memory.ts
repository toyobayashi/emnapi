import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory } from 'emscripten:runtime'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ENV, $CHECK_ARG } from '../macro'
import { $emnapiSetValueI64 as emnapiSetValueI64 } from '../util'

/** @__sig ipjp */
export function napi_adjust_external_memory (
  env: napi_env,
  change_in_bytes: bigint,
  adjusted_value: number
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.getEnv(env)!
  $CHECK_ARG!(envObject, adjusted_value)

  const change_in_bytes_number = Number(change_in_bytes)

  if (change_in_bytes_number < 0) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  const old_size = wasmMemory.buffer.byteLength
  let new_size = old_size + change_in_bytes_number
  new_size = new_size + ((65536 - new_size % 65536) % 65536)
  if (wasmMemory.grow((new_size - old_size + 65535) >> 16) === -1) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  from64('adjusted_value')
  if (emnapiCtx.features.BigInt) {
    makeSetValue('adjusted_value', 0, 'wasmMemory.buffer.byteLength', 'i64')
  } else {
    emnapiSetValueI64(adjusted_value, wasmMemory.buffer.byteLength)
  }

  return envObject.clearLastError()
}
