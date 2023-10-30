/* eslint-disable @typescript-eslint/indent */
declare function _emscripten_resize_heap (requested: number): boolean

function _napi_adjust_external_memory (
  env: napi_env,
  low: number,
  high: number,
  adjusted_value: number
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!

  let change_in_bytes: number

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  change_in_bytes = Number(low)
// #else
  if (!adjusted_value) return envObject.setLastError(napi_status.napi_invalid_arg)
  change_in_bytes = (low >>> 0) + (high * Math.pow(2, 32))
// #endif

  if (change_in_bytes < 0) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  if (change_in_bytes > 0) {
    const old_size = wasmMemory.buffer.byteLength
    const new_size = old_size + change_in_bytes
    if (!_emscripten_resize_heap(new_size)) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
  }

// #if WASM_BIGINT
  $from64('high')
  $makeSetValue('high', 0, 'wasmMemory.buffer.byteLength', 'i64')
// #else
  $from64('adjusted_value')
  $makeSetValue('adjusted_value', 0, 'wasmMemory.buffer.byteLength', 'i64')
// #endif

  return envObject.clearLastError()
}

emnapiImplement('napi_adjust_external_memory', 'ipjp', _napi_adjust_external_memory, ['emscripten_resize_heap'])
