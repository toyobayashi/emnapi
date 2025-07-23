/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_trycatch_construct (tc: Ptr): void {
  emnapiCtx.isolate.pushTryCatch(tc)
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_trycatch_destruct (tc: Ptr): void {
  emnapiCtx.isolate.popTryCatch(tc)
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_trycatch_has_caught (tc: Ptr) {
  const tryCatch = emnapiCtx.isolate.getTryCatch(tc)
  if (!tryCatch) return 0
  return Number(tryCatch.hasCaught())
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_trycatch_rethrow (tc: Ptr) {
  const tryCatch = emnapiCtx.isolate.getTryCatch(tc)
  if (!tryCatch) return 1
  const e = tryCatch.rethrow(emnapiCtx.isolate)
  if (e === undefined) return 1
  return emnapiCtx.napiValueFromJsValue(e)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_trycatch_exception (tc: Ptr) {
  const tryCatch = emnapiCtx.isolate.getTryCatch(tc)
  if (!tryCatch || !tryCatch.hasCaught()) return 1
  return emnapiCtx.napiValueFromJsValue(tryCatch.exception())
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_trycatch_reset (tc: Ptr) {
  const tryCatch = emnapiCtx.isolate.getTryCatch(tc)
  if (!tryCatch) return
  tryCatch.reset()
}
