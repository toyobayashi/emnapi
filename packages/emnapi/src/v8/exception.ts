/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_exception_error (
  message: Ptr,
  options: Ptr
): Ptr {
  return emnapiCtx.napiValueFromJsValue(
    new Error(
      emnapiCtx.jsValueFromNapiValue(message),
      // @ts-ignore
      emnapiCtx.jsValueFromNapiValue(options)
    )
  )
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_exception_type_error (
  message: Ptr,
  options: Ptr
): Ptr {
  return emnapiCtx.napiValueFromJsValue(
    new TypeError(
      emnapiCtx.jsValueFromNapiValue(message),
      // @ts-ignore
      emnapiCtx.jsValueFromNapiValue(options)
    )
  )
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_exception_range_error (
  message: Ptr,
  options: Ptr
): Ptr {
  return emnapiCtx.napiValueFromJsValue(
    new RangeError(
      emnapiCtx.jsValueFromNapiValue(message),
      // @ts-ignore
      emnapiCtx.jsValueFromNapiValue(options)
    )
  )
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_exception_reference_error (
  message: Ptr,
  options: Ptr
): Ptr {
  return emnapiCtx.napiValueFromJsValue(
    new ReferenceError(
      emnapiCtx.jsValueFromNapiValue(message),
      // @ts-ignore
      emnapiCtx.jsValueFromNapiValue(options)
    )
  )
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_exception_syntax_error (
  message: Ptr,
  options: Ptr
): Ptr {
  return emnapiCtx.napiValueFromJsValue(
    new SyntaxError(
      emnapiCtx.jsValueFromNapiValue(message),
      // @ts-ignore
      emnapiCtx.jsValueFromNapiValue(options)
    )
  )
}
