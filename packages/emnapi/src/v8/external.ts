/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_external_new (
  isolate: Ptr,
  data: number
): Ptr {
  const external = emnapiCtx.isolate.createExternal(data)
  return emnapiCtx.napiValueFromJsValue(external)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_external_value (
  external: Ptr
): Ptr {
  const obj = emnapiCtx.jsValueFromNapiValue(external)
  return emnapiCtx.isolate.getExternalValue(obj)
}
