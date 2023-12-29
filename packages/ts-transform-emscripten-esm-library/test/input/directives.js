export function getPointerSize () {
  let result
  // #if MEMORY64
  result = 8
  // #else
  result = 4
  // #endif
  return result
}
