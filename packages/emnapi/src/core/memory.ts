/* eslint-disable @typescript-eslint/indent */

function _napi_adjust_external_memory (
  env: napi_env,
  change_in_bytes: bigint,
  adjusted_value: number
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
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

  $from64('adjusted_value')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer)
  $makeSetValue('adjusted_value', 0, 'wasmMemory.buffer.byteLength', 'i64')

  return envObject.clearLastError()
}

emnapiImplement('napi_adjust_external_memory', 'ipjp', _napi_adjust_external_memory, [])
