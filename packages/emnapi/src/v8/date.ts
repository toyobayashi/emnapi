/**
 * @__deps $emnapiCtx
 * @__sig ppd
 */
export function _v8_date_new (context: Ptr, value: double): Ptr {
  return emnapiCtx.napiValueFromJsValue(new Date(value))
}
