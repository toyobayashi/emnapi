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
 * @__sig ppp
 */
export function _v8_string_object_new (isolate: Ptr, value: Ptr): Ptr {
  // eslint-disable-next-line no-new-wrappers
  return emnapiCtx.napiValueFromJsValue(new String(emnapiCtx.jsValueFromNapiValue(value)))
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_string_object_value_of (self: Ptr): Ptr {
  const strObj = emnapiCtx.jsValueFromNapiValue(self)
  return emnapiCtx.napiValueFromJsValue(strObj.valueOf())
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppii
 */
export function _v8_string_new_from_one_byte (isolate: Ptr, data: Ptr, type: number, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.encode(data as number, length === -1, length >>> 0, (c) => String.fromCharCode(c))
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppii
 */
export function _v8_string_new_from_two_byte (isolate: Ptr, data: Ptr, type: number, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.UTF16ToString(data as number, length)
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppi
 */
export function _v8_string_new_external_one_byte (isolate: Ptr, data: Ptr, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.encode(data as number, length === -1, length >>> 0, (c) => String.fromCharCode(c))
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppi
 */
export function _v8_string_new_external_two_byte (isolate: Ptr, data: Ptr, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.UTF16ToString(data as number, length)
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__sig pppi
 */
export function _v8_regex_new (context: Ptr, pattern: Ptr, flags: number): Ptr {
  from64('pattern')
  const str = emnapiCtx.jsValueFromNapiValue(pattern)
  let f = ''
  if (flags & 1) f += 'g'
  if (flags & 2) f += 'i'
  if (flags & 4) f += 'm'
  if (flags & 8) f += 'y'
  if (flags & 16) f += 'u'
  if (flags & 32) f += 's'
  return emnapiCtx.napiValueFromJsValue(f ? new RegExp(str, f) : new RegExp(str))
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
 * @__sig ip
 */
export function _v8_string_length (str: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(str)
  if (jsValue === undefined) return 0
  if (typeof jsValue !== 'string') return 0
  return jsValue.length
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
