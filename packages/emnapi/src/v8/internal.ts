/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_globalize_reference (isolate: Ptr, value: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue === undefined) return 0
  // TODO
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_dispose_global (ref: Ptr): void {
  // TODO
}

/**
 * @__deps $emnapiCtx
 * @__sig vppppi
 */
export function _v8_make_weak (ref: Ptr, data: Ptr, callback: Ptr, weak_callback: Ptr, type: number): void {
  // TODO
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_clear_weak (ref: Ptr): Ptr {
  // TODO
  return 0
}
