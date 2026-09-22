import { from64, makeDynCall, makeGetValue, makeSetValue, POINTER_SIZE } from 'emscripten:parse-tools'

type PropertyKeyValue = string | symbol

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
 * @__sig ippipp
 */
export function _v8_object_set_index (obj: Ptr, _context: Ptr, index: number, value: Ptr, success: Ptr): number {
  let r = false
  try {
    r = Reflect.set(
      emnapiCtx.jsValueFromNapiValue(obj),
      index >>> 0,
      emnapiCtx.jsValueFromNapiValue(value)
    )
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
 * @__sig ippppip
 */
export function _v8_object_define_own_property (
  obj: Ptr,
  _context: Ptr,
  key: Ptr,
  value: Ptr,
  attributes: number,
  success: Ptr
): number {
  from64('obj')
  from64('key')
  from64('value')
  from64('success')
  try {
    const target = emnapiCtx.jsValueFromNapiValue(obj) as object
    const propertyKey = emnapiCtx.jsValueFromNapiValue(key) as PropertyKeyValue
    const propertyValue = emnapiCtx.jsValueFromNapiValue(value)
    const result = Reflect.defineProperty(target, propertyKey, {
      value: propertyValue,
      writable: (attributes & 1) === 0,
      enumerable: (attributes & 2) === 0,
      configurable: (attributes & 4) === 0
    })
    const successValue = result ? 1 : 0
    if (success) makeSetValue('success', 0, 'successValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_get_property_attributes (
  obj: Ptr,
  _context: Ptr,
  key: Ptr,
  attributes: Ptr
): number {
  from64('obj')
  from64('key')
  from64('attributes')
  try {
    const target = emnapiCtx.jsValueFromNapiValue(obj)
    const propertyKey = emnapiCtx.jsValueFromNapiValue(key) as PropertyKeyValue
    let current = target
    let descriptor: PropertyDescriptor | undefined
    while (current !== null) {
      descriptor = Object.getOwnPropertyDescriptor(current, propertyKey)
      if (descriptor) break
      current = Object.getPrototypeOf(current)
    }
    let result = 0
    if (descriptor) {
      const readonly = 'writable' in descriptor ? descriptor.writable === false : descriptor.set == null
      if (readonly) result |= 1
      if (descriptor.enumerable === false) result |= 2
      if (descriptor.configurable === false) result |= 4
    }
    from64('attributes')
    if (attributes) makeSetValue('attributes', 0, 'result', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_has (obj: Ptr, _context: Ptr, key: Ptr, result: Ptr): number {
  from64('obj')
  from64('key')
  from64('result')
  try {
    const has = Reflect.has(
      emnapiCtx.jsValueFromNapiValue(obj) as object,
      emnapiCtx.jsValueFromNapiValue(key) as PropertyKeyValue
    )
    const hasValue = has ? 1 : 0
    if (result) makeSetValue('result', 0, 'hasValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ippip
 */
export function _v8_object_has_index (obj: Ptr, _context: Ptr, index: number, result: Ptr): number {
  from64('obj')
  from64('result')
  try {
    const has = Reflect.has(emnapiCtx.jsValueFromNapiValue(obj) as object, index >>> 0)
    const hasValue = has ? 1 : 0
    if (result) makeSetValue('result', 0, 'hasValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_delete (obj: Ptr, _context: Ptr, key: Ptr, result: Ptr): number {
  from64('obj')
  from64('key')
  from64('result')
  try {
    const deleted = Reflect.deleteProperty(
      emnapiCtx.jsValueFromNapiValue(obj) as object,
      emnapiCtx.jsValueFromNapiValue(key) as PropertyKeyValue
    )
    const deletedValue = deleted ? 1 : 0
    if (result) makeSetValue('result', 0, 'deletedValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ippip
 */
export function _v8_object_delete_index (obj: Ptr, _context: Ptr, index: number, result: Ptr): number {
  from64('obj')
  from64('result')
  try {
    const deleted = Reflect.deleteProperty(emnapiCtx.jsValueFromNapiValue(obj) as object, String(index >>> 0))
    const deletedValue = deleted ? 1 : 0
    if (result) makeSetValue('result', 0, 'deletedValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_object_get_property_names (obj: Ptr, _context: Ptr): Ptr {
  from64('obj')
  try {
    const names: PropertyKeyValue[] = []
    let current = emnapiCtx.jsValueFromNapiValue(obj)
    while (current !== null) {
      for (const propertyKey of Reflect.ownKeys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, propertyKey)
        if (descriptor?.enumerable && names.indexOf(propertyKey) === -1) names.push(propertyKey)
      }
      current = Object.getPrototypeOf(current)
    }
    return emnapiCtx.napiValueFromJsValue(names)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 0
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_object_get_own_property_names (obj: Ptr, _context: Ptr): Ptr {
  from64('obj')
  try {
    const names: PropertyKeyValue[] = []
    const current = emnapiCtx.jsValueFromNapiValue(obj)
    for (const propertyKey of Reflect.ownKeys(current)) {
      if (names.indexOf(propertyKey) === -1) names.push(propertyKey)
    }
    return emnapiCtx.napiValueFromJsValue(names)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 0
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_set_prototype (obj: Ptr, _context: Ptr, prototype: Ptr, result: Ptr): number {
  from64('obj')
  from64('prototype')
  from64('result')
  try {
    const changed = Reflect.setPrototypeOf(
      emnapiCtx.jsValueFromNapiValue(obj) as object,
      emnapiCtx.jsValueFromNapiValue(prototype) as object | null
    )
    const changedValue = changed ? 1 : 0
    if (result) makeSetValue('result', 0, 'changedValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_object_has_own_property (obj: Ptr, _context: Ptr, key: Ptr, result: Ptr): number {
  from64('obj')
  from64('key')
  from64('result')
  try {
    const has = Object.prototype.hasOwnProperty.call(
      emnapiCtx.jsValueFromNapiValue(obj),
      emnapiCtx.jsValueFromNapiValue(key) as PropertyKeyValue
    )
    const hasValue = has ? 1 : 0
    if (result) makeSetValue('result', 0, 'hasValue', 'i32')
    return 0
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ppppip
 */
export function _v8_object_call_as_function (obj: Ptr, _context: Ptr, receiver: Ptr, argc: number, argv: Ptr): Ptr {
  from64('obj')
  from64('receiver')
  from64('argv')
  try {
    const argList = Array(argc)
    for (let i = 0; i < argc; i++) {
      const argValue = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
      argList[i] = emnapiCtx.jsValueFromNapiValue(argValue)
    }
    const result = Reflect.apply(
      emnapiCtx.jsValueFromNapiValue(obj) as Function,
      emnapiCtx.jsValueFromNapiValue(receiver),
      argList
    )
    return emnapiCtx.napiValueFromJsValue(result)
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 0
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig pppip
 */
export function _v8_object_call_as_constructor (obj: Ptr, _context: Ptr, argc: number, argv: Ptr): Ptr {
  from64('obj')
  from64('argv')
  try {
    const argList = Array(argc)
    for (let i = 0; i < argc; i++) {
      const argValue = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
      argList[i] = emnapiCtx.jsValueFromNapiValue(argValue)
    }
    const constructor = emnapiCtx.jsValueFromNapiValue(obj) as Function
    return emnapiCtx.napiValueFromJsValue(Reflect.construct(constructor, argList, constructor))
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 0
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig ippppppppiiip
 */
export function _v8_object_set_accessor (
  obj: Ptr,
  _context: Ptr,
  name: Ptr,
  getter_wrap: Ptr,
  setter_wrap: Ptr,
  getter: Ptr,
  setter: Ptr,
  data: Ptr,
  attribute: number,
  getter_side_effect_type: number,
  setter_side_effect_type: number,
  success: Ptr
): number {
  if (emnapiCtx.isolate.hasPendingException()) return 1

  from64('getter_wrap')
  from64('setter_wrap')
  const getterWrap = getter_wrap ? makeDynCall('pppp', 'getter_wrap') : undefined
  const setterWrap = setter_wrap ? makeDynCall('ppppp', 'setter_wrap') : undefined

  try {
    const objectTemplate = emnapiCtx.isolate.createObjectTemplate(undefined)
    const nameValue = emnapiCtx.jsValueFromNapiValue(name) as string | symbol
    if (nameValue == null) return 1
    objectTemplate.setAccessorOnInstance(
      emnapiCtx.jsValueFromNapiValue(obj),
      nameValue,
      getterWrap!,
      setterWrap!,
      getter,
      setter,
      emnapiCtx.jsValueFromNapiValue(data),
      attribute,
      getter_side_effect_type,
      setter_side_effect_type
    )
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }

  from64('success')
  if (success) makeSetValue('success', 0, '1', 'i32')
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
 * @__sig ppi
 */
export function _v8_object_get_internal_field (
  obj: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  const value = emnapiCtx.isolate.getInternalField(objValue, index)
  return emnapiCtx.isolate.napiValueFromJsValue(value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_object_get_aligned_pointer_in_internal_field (
  obj: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  const value = emnapiCtx.isolate.getInternalField(objValue, index)
  return value
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
