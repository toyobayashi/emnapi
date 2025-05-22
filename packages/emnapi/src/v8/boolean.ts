/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_boolean_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return jsValue ? 1 : 0
}
