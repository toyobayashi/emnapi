import { from64, makeSetValue } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppii
 */
export function _v8_string_new_from_utf8 (isolate: Ptr, data: Ptr, type: number, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.UTF8ToString(data as number, length)
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig ipp
 */
export function _v8_string_utf8_length (str: Ptr, isolate: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(str)
  if (jsValue === undefined) return 0
  if (typeof jsValue !== 'string') return 0
  return emnapiString.lengthBytesUTF8(jsValue)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig ipppipi
 */
export function _v8_string_write_utf8 (
  str: Ptr,
  isolate: Ptr,
  buffer: Ptr,
  length: number,
  nchars_ref: Ptr,
  options: number
): number {
  from64('buffer')
  from64('nchars_ref')
  const jsValue = emnapiCtx.jsValueFromNapiValue(str)
  if (jsValue === undefined || typeof jsValue !== 'string') {
    if (nchars_ref) {
      makeSetValue('nchars_ref', 0, '0', 'i32')
    }
    return 0
  }

  const written = emnapiString.stringToUTF8(jsValue, buffer as number, length)

  if (nchars_ref) {
    makeSetValue('nchars_ref', 0, 'written', 'i32')
  }

  return written
}
