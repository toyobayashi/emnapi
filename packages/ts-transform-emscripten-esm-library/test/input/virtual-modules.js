import { from64, makeSetValue, SIZE_TYPE, POINTER_SIZE } from 'emscripten:parse-tools'
import { wasmMemory, HEAPU8 } from 'emscripten:runtime'

export function getPointerSize (ret) {
  from64('ret')
  makeSetValue('ret', 0, POINTER_SIZE, SIZE_TYPE)
  console.log(HEAPU8.buffer === wasmMemory.buffer)
  return POINTER_SIZE
}
