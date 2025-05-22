/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_boolean (value: Ptr, isolate: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const boolValue = Boolean(jsValue)
  return emnapiCtx.napiValueFromJsValue(boolValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_number (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const numValue = Number(jsValue)
  return emnapiCtx.napiValueFromJsValue(numValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_string (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const strValue = String(jsValue)
  return emnapiCtx.napiValueFromJsValue(strValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_object (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue === null || jsValue === undefined) return 0
  const objValue = Object(jsValue)
  return emnapiCtx.napiValueFromJsValue(objValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_integer (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const intValue = Number(jsValue) | 0
  return emnapiCtx.napiValueFromJsValue(intValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_uint32 (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const uint32Value = Number(jsValue) >>> 0
  return emnapiCtx.napiValueFromJsValue(uint32Value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_int32 (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const int32Value = Number(jsValue) | 0
  return emnapiCtx.napiValueFromJsValue(int32Value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_array_index (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  // V8: ToArrayIndex returns uint32 if possible, else undefined
  const n = Number(jsValue)
  if (
    typeof n === 'number' &&
    isFinite(n) &&
    n >= 0 &&
    n <= 0xffffffff &&
    Math.floor(n) === n
  ) {
    return emnapiCtx.napiValueFromJsValue(n >>> 0)
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_value_is_function (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue == null) return 0
  const isFunction = typeof jsValue === 'function'
  return isFunction ? 1 : 0
}
