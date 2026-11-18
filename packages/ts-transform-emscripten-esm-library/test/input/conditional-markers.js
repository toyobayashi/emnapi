import { makeSetValue } from 'emscripten:parse-tools'

export function getPointerSizeFromMarkers () {
  let result
  __emnapi_conditional_if__("MEMORY64")
  makeSetValue('result', 0, '8', 'i32')
  __emnapi_conditional_elif__("MEMORY64 == 0")
  makeSetValue('result', 0, '4', 'i32')
  __emnapi_conditional_else__()
  result = 0
  __emnapi_conditional_endif__()
  return result
}
