/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_array_new (context: Ptr, value: int): Ptr {
  return emnapiCtx.napiValueFromJsValue(Array(value))
}
