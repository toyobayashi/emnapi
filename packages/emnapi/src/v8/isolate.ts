/**
 * @__sig p
 */
export function _v8_isolate_get_current_context (): number {
  return GlobalHandle.GLOBAL
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_isolate_throw_exception (error: Ptr): Ptr {
  emnapiCtx.isolate.throwException(emnapiCtx.jsValueFromNapiValue(error))
  return error
}
