/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_boolean_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return jsValue ? 1 : 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_boolean_object_new (isolate: Ptr, value: number): Ptr {
  // eslint-disable-next-line no-new-wrappers
  return emnapiCtx.napiValueFromJsValue(new Boolean(value))
}
