import { from64, makeSetValue, SIZE_TYPE } from 'emscripten:parse-tools'
import { wasmMemory, _malloc } from 'emscripten:runtime'

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_array_buffer_view_buffer (view: Ptr): Ptr {
  const value = emnapiCtx.jsValueFromNapiValue<any>(view)
  if (value == null || !ArrayBuffer.isView(value)) return 0
  return emnapiCtx.napiValueFromJsValue(value.buffer)
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_array_buffer_view_byte_offset (view: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(view)
  return value == null || !ArrayBuffer.isView(value) ? 0 : value.byteOffset
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_array_buffer_view_byte_length (view: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(view)
  return value == null || !ArrayBuffer.isView(value) ? 0 : value.byteLength
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_array_buffer_byte_length (buffer: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(buffer)
  return value == null ? 0 : value.byteLength
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_array_buffer_get_backing_store (
  buffer: Ptr,
  byte_length: Ptr
): Ptr {
  const value = emnapiCtx.jsValueFromNapiValue<ArrayBufferLike>(buffer)
  if (value == null) return 0
  const source = new Uint8Array(value as ArrayBufferLike)
  const pointer = Number(_malloc(source.byteLength))
  new Uint8Array(wasmMemory.buffer).set(source, pointer)
  const byteLength = source.byteLength
  from64('byte_length')
  if (byte_length) makeSetValue('byte_length', 0, 'byteLength', SIZE_TYPE)
  return pointer
}
