/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_function_set_name (fn: Ptr, name: Ptr): void {
  if (!emnapiCtx.features.setFunctionName) {
    return
  }
  const str = emnapiCtx.jsValueFromNapiValue(name)
  const func = emnapiCtx.jsValueFromNapiValue(fn)
  emnapiCtx.features.setFunctionName(func, str)
}
