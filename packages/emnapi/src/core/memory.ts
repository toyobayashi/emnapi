/* eslint-disable @typescript-eslint/indent */

import { emnapiCtx } from 'emnapi:shared'
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
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, adjusted_value)

  // eslint-disable-next-line prefer-const
  let adjusted_memory = emnapiCtx.adjustAmountOfExternalAllocatedMemory(change_in_bytes)

  from64('adjusted_value')
  if (emnapiCtx.feature.supportBigInt) {
    makeSetValue('adjusted_value', 0, 'adjusted_memory', 'i64')
  } else {
    emnapiSetValueI64(adjusted_value, Number(adjusted_memory))
  }

  return envObject.clearLastError()
}
