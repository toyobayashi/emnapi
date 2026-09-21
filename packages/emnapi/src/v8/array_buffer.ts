import { from64, makeSetValue, SIZE_TYPE } from 'emscripten:parse-tools'
import { wasmMemory, _malloc } from 'emscripten:runtime'

const backingStoreData = new Map<Ptr, { data: Ptr, byteLength: number }>()

/**
 * @__sig vppp
 */
export function _v8_backing_store_set (
  backing_store: Ptr,
  data: Ptr,
  byte_length: size_t
): void {
  from64('backing_store')
  from64('data')
  from64('byte_length')
  backingStoreData.set(backing_store, { data, byteLength: byte_length })
}

/**
 * @__sig pp
 */
export function _v8_backing_store_data (backing_store: Ptr): Ptr {
  from64('backing_store')
  return backingStoreData.get(backing_store)?.data ?? 0
}

/**
 * @__sig pp
 */
export function _v8_backing_store_byte_length (backing_store: Ptr): size_t {
  from64('backing_store')
  return backingStoreData.get(backing_store)?.byteLength ?? 0
}

/**
 * @__sig vp
 */
export function _v8_backing_store_delete (backing_store: Ptr): void {
  from64('backing_store')
  backingStoreData.delete(backing_store)
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
 * @__sig ppp
 */
export function _v8_array_buffer_get_backing_store (
  buffer: Ptr,
  byte_length: Ptr
): Ptr {
  const value = emnapiCtx.jsValueFromNapiValue<ArrayBufferLike>(buffer)
  if (value == null) return 0
  const source = new Uint8Array(value as ArrayBufferLike)
  let pointer = _malloc(source.byteLength) as number
  from64('pointer')
  new Uint8Array(wasmMemory.buffer).set(source, pointer)
  const byteLength = source.byteLength
  from64('byte_length')
  if (byte_length) makeSetValue('byte_length', 0, 'byteLength', SIZE_TYPE)
  return pointer
}
