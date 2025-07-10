import { from64, makeSetValue } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig ippppp
 */
export function _v8_object_set (obj: Ptr, context: Ptr, key: Ptr, value: Ptr, success: Ptr): number {
  let r = false
  try {
    r = Reflect.set(emnapiCtx.jsValueFromNapiValue(obj), emnapiCtx.jsValueFromNapiValue(key), emnapiCtx.jsValueFromNapiValue(value))
  } catch (_) {
    return 10
  }
  from64('success')
  if (success) {
    const v = r ? 1 : 0
    makeSetValue('success', 0, 'v', 'i32')
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_object_internal_field_count (
  obj: Ptr
): number {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  return emnapiCtx.getInternalFieldCount(objValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpip
 */
export function _v8_object_set_internal_field (
  obj: Ptr,
  index: number,
  data: Ptr
): void {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  const dataValue = emnapiCtx.jsValueFromNapiValue(data)
  emnapiCtx.setInternalField(objValue, index, dataValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpip
 */
export function _v8_object_set_aligned_pointer_in_internal_field (
  obj: Ptr,
  index: number,
  data: Ptr
): void {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  emnapiCtx.setInternalField(objValue, index, data)
}

/**
 * @__deps $emnapiCtx
 * @__sig pip
 */
export function _v8_object_get_internal_field (
  obj: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  return emnapiCtx.napiValueFromJsValue(emnapiCtx.getInternalField(objValue, index))
}

/**
 * @__deps $emnapiCtx
 * @__sig pip
 */
export function _v8_object_get_aligned_pointer_in_internal_field (
  obj: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  return emnapiCtx.getInternalField(objValue, index)
}

/**
 * @__deps $emnapiCtx
 * @__sig pppp
 */
export function _v8_object_get_key (
  obj: Ptr,
  context: Ptr,
  key: Ptr
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  if (!objValue) return 1
  return emnapiCtx.napiValueFromJsValue(objValue[emnapiCtx.jsValueFromNapiValue(key)])
}

/**
 * @__deps $emnapiCtx
 * @__sig pppi
 */
export function _v8_object_get_index (
  obj: Ptr,
  context: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  if (!objValue) return 1
  return emnapiCtx.napiValueFromJsValue(objValue[index >>> 0])
}
