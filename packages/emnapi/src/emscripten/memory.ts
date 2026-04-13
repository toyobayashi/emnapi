import { emnapiCtx, emnapiEnv } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $emnapiSetValueI64 as emnapiSetValueI64 } from '../util'
import { $CHECK_ENV } from '../macro'

/* eslint-disable @stylistic/indent */

/**
 * @__sig ipjp
 */
export function napi_adjust_external_memory (
  env: napi_env,
  low: number,
  high: number,
  adjusted_value: number
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiEnv

  let change_in_bytes: bigint

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  change_in_bytes = BigInt(low)
// #else
  if (!adjusted_value) return envObject.setLastError(napi_status.napi_invalid_arg)
  change_in_bytes = BigInt(low >>> 0) + (BigInt(high) << BigInt(32))
// #endif

  const adjusted_memory = emnapiCtx.adjustAmountOfExternalAllocatedMemory(change_in_bytes)

// #if WASM_BIGINT
  from64('high')
  if (emnapiCtx.features.BigInt) {
    makeSetValue('high', 0, 'adjusted_memory', 'i64')
  } else {
    emnapiSetValueI64(high, Number(adjusted_memory))
  }
// #else
  from64('adjusted_value')
  makeSetValue('adjusted_value', 0, 'adjusted_memory', 'i64')
// #endif

  return envObject.clearLastError()
}
