/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_array_new (context: Ptr, value: int): Ptr {
  return emnapiCtx.napiValueFromJsValue(Array(value))
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_array_length (array: Ptr): int {
  const arr = emnapiCtx.jsValueFromNapiValue(array) as any[]
  return arr.length
}
