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
  return emnapiCtx.isolate.getInternalFieldCount(objValue)
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
  emnapiCtx.isolate.setInternalField(objValue, index, dataValue)
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
  emnapiCtx.isolate.setInternalField(objValue, index, data)
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
  return emnapiCtx.isolate.napiValueFromJsValue(emnapiCtx.isolate.getInternalField(objValue, index))
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
  return emnapiCtx.isolate.getInternalField(objValue, index)
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

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_private_for_api (isolate: Ptr, name: Ptr): Ptr {
  const n = emnapiCtx.isolate.getOrCreateGlobalPrivate(emnapiCtx.jsValueFromNapiValue(name) as string)
  return emnapiCtx.napiValueFromJsValue(n)
}

/**
 * @__deps $emnapiCtx
 * @__sig ippppp
 */
export function _v8_object_set_private (
  obj: Ptr,
  context: Ptr,
  key: Ptr,
  value: Ptr,
  success: Ptr
): number {
  if (emnapiCtx.isolate.hasPendingException()) return 1
  const o = emnapiCtx.jsValueFromNapiValue(obj)
  const k = emnapiCtx.jsValueFromNapiValue(key)
  const v = emnapiCtx.jsValueFromNapiValue(value)
  try {
    emnapiCtx.isolate.setPrivate(o, k, v)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
  from64('success')
  if (success) {
    const vv = 1
    makeSetValue('success', 0, 'vv', 'i32')
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_has_private (
  obj: Ptr,
  context: Ptr,
  key: Ptr,
  has: Ptr
): number {
  if (emnapiCtx.isolate.hasPendingException()) return 1
  const o = emnapiCtx.jsValueFromNapiValue(obj)
  const k = emnapiCtx.jsValueFromNapiValue(key)
  let v: number
  try {
    v = emnapiCtx.isolate.hasPrivate(o, k) ? 1 : 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
  from64('has')
  if (has) makeSetValue('has', 0, 'v', 'i32')
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pppp
 */
export function _v8_object_get_private (
  obj: Ptr,
  context: Ptr,
  key: Ptr
): Ptr {
  if (emnapiCtx.isolate.hasPendingException()) return 1
  const o = emnapiCtx.jsValueFromNapiValue(obj)
  const k = emnapiCtx.jsValueFromNapiValue(key)
  try {
    const v = emnapiCtx.isolate.getPrivate(o, k)
    return emnapiCtx.napiValueFromJsValue(v)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_delete_private (
  obj: Ptr,
  context: Ptr,
  key: Ptr,
  success: Ptr
): number {
  if (emnapiCtx.isolate.hasPendingException()) return 1
  const o = emnapiCtx.jsValueFromNapiValue(obj)
  const k = emnapiCtx.jsValueFromNapiValue(key)
  let r: boolean
  try {
    r = emnapiCtx.isolate.deletePrivate(o, k)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
  from64('success')
  if (success) {
    const vv = r ? 1 : 0
    makeSetValue('success', 0, 'vv', 'i32')
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_object_new (isolate: Ptr): Ptr {
  return emnapiCtx.napiValueFromJsValue({})
}
