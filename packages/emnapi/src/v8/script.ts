/**
 * @__deps $emnapiCtx
 * @__sig pppii
 */
export function _v8_script_compiler_compile_unbound_script (
  isolate: Ptr,
  sourceString: Ptr,
  options: number,
  reason: number
): Ptr {
  const str = emnapiCtx.jsValueFromNapiValue(sourceString)
  if (!str) return 1
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_unbound_script_bind_to_current_context (
  unboundScript: Ptr
): Ptr {
  const str = emnapiCtx.jsValueFromNapiValue(unboundScript)
  if (!str) return 1
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_script_run (script: Ptr, context: Ptr): Ptr {
  if (emnapiCtx.hasPendingException()) return 1
  const str = emnapiCtx.jsValueFromNapiValue(script)
  const g = emnapiCtx.jsValueFromNapiValue<typeof globalThis>(context)!
  let ret: any
  try {
    ret = g.eval(str)
  } catch (err) {
    emnapiCtx.throwException(err)
    return 1
  }
  return emnapiCtx.napiValueFromJsValue(ret)
}
