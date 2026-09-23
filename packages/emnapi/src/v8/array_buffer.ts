import { from64, makeSetValue, SIZE_TYPE } from 'emscripten:parse-tools'

/**
 * @__sig vpppp
 * @__deps $emnapiCtx
 * @__deps $emnapiExternalMemory
 */
export function _v8_backing_store_set (
  backing_store: Ptr,
  buffer: Ptr,
  data: Ptr,
  byte_length: size_t
): void {
  from64('backing_store')
  from64('buffer')
  from64('data')
  from64('byte_length')
  const arrayBuffer = emnapiCtx.jsValueFromNapiValue<ArrayBufferLike>(buffer) as ArrayBufferLike
  emnapiExternalMemory.setBackingStore(backing_store, data, byte_length, arrayBuffer)
}

/**
 * @__sig pp
 * @__deps $emnapiExternalMemory
 */
export function _v8_backing_store_data (backing_store: Ptr): Ptr {
  from64('backing_store')
  return emnapiExternalMemory.getBackingStoreData(backing_store)
}

/**
 * @__sig pp
 * @__deps $emnapiExternalMemory
 */
export function _v8_backing_store_byte_length (backing_store: Ptr): size_t {
  from64('backing_store')
  return emnapiExternalMemory.getBackingStoreByteLength(backing_store)
}

/**
 * @__sig vp
 * @__deps $emnapiExternalMemory
 */
export function _v8_backing_store_delete (backing_store: Ptr): void {
  from64('backing_store')
  emnapiExternalMemory.deleteBackingStore(backing_store)
}

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
 * @__sig pp
 */
export function _v8_array_buffer_view_byte_offset (view: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(view)
  return value == null || !ArrayBuffer.isView(value) ? 0 : value.byteOffset
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_array_buffer_view_byte_length (view: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(view)
  return value == null || !ArrayBuffer.isView(value) ? 0 : value.byteLength
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_array_buffer_byte_length (buffer: Ptr): size_t {
  const value = emnapiCtx.jsValueFromNapiValue<any>(buffer)
  return value == null ? 0 : value.byteLength
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiExternalMemory
 * @__sig ppp
 */
export function _v8_array_buffer_get_backing_store (
  buffer: Ptr,
  byte_length: Ptr
): Ptr {
  const value = emnapiCtx.jsValueFromNapiValue<ArrayBufferLike>(buffer)
  if (value == null) return 0
  const pointer = emnapiExternalMemory.getArrayBufferPointer(value as ArrayBufferLike, true).address
  const byteLength = emnapiExternalMemory.bufferByteLength(value as ArrayBufferLike)
  from64('byte_length')
  if (byte_length) makeSetValue('byte_length', 0, 'byteLength', SIZE_TYPE)
  return pointer
}
