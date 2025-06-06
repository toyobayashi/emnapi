import { from64, makeSetValue } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig dp
 */
export function _v8_number_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_integer_value (value: Ptr, out: Ptr): void {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  // Use BigInt if available, else fallback to Number
  let v: bigint | number
  if (typeof jsValue === 'bigint') {
    v = jsValue
  } else {
    v = Math.trunc(Number(jsValue))
  }
  from64('out')
  makeSetValue('out', 0, 'v', 'i64')
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_uint32_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue) >>> 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_int32_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue) | 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppd
 */
export function _v8_number_new (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_integer_new (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value | 0)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_integer_new_from_unsigned (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value >>> 0)
}
