import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory } from 'emscripten:runtime'
import { emnapiDefineProperty } from './internal'
import { $PREAMBLE, $CHECK_ARG } from './macro'
import { emnapiString } from './string'
import { POINTER_SIZE, from64 } from 'emscripten:parse-tools'
import { emnapiMemory } from './memory-view'

/** @__sig ippiiip */
export function napi_get_all_property_names (
  env: napi_env,
  object: napi_value,
  key_mode: napi_key_collection_mode,
  key_filter: napi_key_filter,
  key_conversion: napi_key_conversion,
  result: Pointer<napi_value>
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let obj: any
    try {
      obj = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    if (key_mode !== napi_key_collection_mode.napi_key_include_prototypes && key_mode !== napi_key_collection_mode.napi_key_own_only) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (key_conversion !== napi_key_conversion.napi_key_keep_numbers && key_conversion !== napi_key_conversion.napi_key_numbers_to_strings) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    const props: Array<{ name: string | number | symbol; desc: PropertyDescriptor; own: boolean }> = []
    let names: string[]
    let symbols: symbol[]
    let i: number
    let own: boolean = true
    const integerIndiceRegex = /^(0|[1-9][0-9]*)$/
    do {
      names = Object.getOwnPropertyNames(obj)
      symbols = Object.getOwnPropertySymbols(obj)
      for (i = 0; i < names.length; i++) {
        props.push({
          name: integerIndiceRegex.test(names[i]) ? Number(names[i]) : names[i],
          desc: Object.getOwnPropertyDescriptor(obj, names[i])!,
          own
        })
      }
      for (i = 0; i < symbols.length; i++) {
        props.push({
          name: symbols[i],
          desc: Object.getOwnPropertyDescriptor(obj, symbols[i])!,
          own
        })
      }
      if (key_mode === napi_key_collection_mode.napi_key_own_only) {
        break
      }
      obj = Object.getPrototypeOf(obj)
      own = false
    } while (obj)
    const ret: PropertyKey[] = []
    const addName = function (ret: PropertyKey[], name: PropertyKey, key_filter: number, conversion_mode: napi_key_conversion): void {
      if (ret.indexOf(name) !== -1) return
      if (conversion_mode === napi_key_conversion.napi_key_keep_numbers) {
        ret.push(name)
      } else if (conversion_mode === napi_key_conversion.napi_key_numbers_to_strings) {
        const realName = typeof name === 'number' ? String(name) : name
        if (typeof realName === 'string') {
          if (!(key_filter & napi_key_filter.napi_key_skip_strings)) {
            ret.push(realName)
          }
        } else {
          ret.push(realName)
        }
      }
    }
    for (i = 0; i < props.length; i++) {
      const prop = props[i]
      const name = prop.name
      const desc = prop.desc
      if (key_filter === napi_key_filter.napi_key_all_properties) {
        addName(ret, name, key_filter, key_conversion)
      } else {
        if (key_filter & napi_key_filter.napi_key_skip_strings && typeof name === 'string') {
          continue
        }
        if (key_filter & napi_key_filter.napi_key_skip_symbols && typeof name === 'symbol') {
          continue
        }
        let shouldAdd = true
        switch (key_filter & 7) {
          case napi_key_filter.napi_key_writable: {
            shouldAdd = Boolean(desc.writable)
            break
          }
          case napi_key_filter.napi_key_enumerable: {
            shouldAdd = Boolean(desc.enumerable)
            break
          }
          case (napi_key_filter.napi_key_writable | napi_key_filter.napi_key_enumerable): {
            shouldAdd = Boolean(desc.writable && desc.enumerable)
            break
          }
          case napi_key_filter.napi_key_configurable: {
            shouldAdd = Boolean(desc.configurable)
            break
          }
          case (napi_key_filter.napi_key_configurable | napi_key_filter.napi_key_writable): {
            shouldAdd = Boolean(desc.configurable && desc.writable)
            break
          }
          case (napi_key_filter.napi_key_configurable | napi_key_filter.napi_key_enumerable): {
            shouldAdd = Boolean(desc.configurable && desc.enumerable)
            break
          }
          case (napi_key_filter.napi_key_configurable | napi_key_filter.napi_key_enumerable | napi_key_filter.napi_key_writable): {
            shouldAdd = Boolean(desc.configurable && desc.enumerable && desc.writable)
            break
          }
        }
        if (shouldAdd) {
          addName(ret, name, key_filter, key_conversion)
        }
      }
    }

    from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(ret).id
    emnapiMemory.setPointer(wasmMemory, result as number, value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippp */
export function napi_get_property_names (env: napi_env, object: napi_value, result: Pointer<napi_value>): napi_status {
  return napi_get_all_property_names(
    env,
    object,
    napi_key_collection_mode.napi_key_include_prototypes,
    napi_key_filter.napi_key_enumerable | napi_key_filter.napi_key_skip_symbols,
    napi_key_conversion.napi_key_numbers_to_strings,
    result
  )
}

/** @__sig ipppp */
export function napi_set_property (env: napi_env, object: napi_value, key: napi_value, value: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, key)
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    h.value[emnapiCtx.handleStore.get(key)!.value] = emnapiCtx.handleStore.get(value)!.value
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_has_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let r: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, key)
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')
    r = (emnapiCtx.handleStore.get(key)!.value in v) ? 1 : 0
    emnapiMemory.setInt8(wasmMemory, result as number, r)
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_get_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, key)
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = envObject.ensureHandleId(v[emnapiCtx.handleStore.get(key)!.value])
    emnapiMemory.setPointer(wasmMemory, result as number, value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_delete_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let r: boolean

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, key)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    const propertyKey = emnapiCtx.handleStore.get(key)!.value
    if (emnapiCtx.feature.supportReflect) {
      r = Reflect.deleteProperty(h.value, propertyKey)
    } else {
      try {
        r = delete h.value[propertyKey]
      } catch (_) {
        r = false
      }
    }
    if (result) {
      from64('result')
      emnapiMemory.setInt8(wasmMemory, result as number, r ? 1 : 0)
    }
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_has_own_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number, r: boolean

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, key)
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    const prop = emnapiCtx.handleStore.get(key)!.value
    if (typeof prop !== 'string' && typeof prop !== 'symbol') {
      return envObject.setLastError(napi_status.napi_name_expected)
    }
    r = Object.prototype.hasOwnProperty.call(v, emnapiCtx.handleStore.get(key)!.value)
    from64('result')
    emnapiMemory.setInt8(wasmMemory, result as number, r ? 1 : 0)
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_set_named_property (env: napi_env, object: napi_value, cname: const_char_p, value: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    if (!cname) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    from64('cname')
    emnapiCtx.handleStore.get(object)!.value[emnapiString.UTF8ToString(cname, -1)] = emnapiCtx.handleStore.get(value)!.value
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_has_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let r: boolean

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    if (!utf8name) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('utf8name')
    from64('result')

    r = emnapiString.UTF8ToString(utf8name, -1) in v
    emnapiMemory.setInt8(wasmMemory, result as number, r ? 1 : 0)
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_get_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    if (!utf8name) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('utf8name')
    from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = envObject.ensureHandleId(v[emnapiString.UTF8ToString(utf8name, -1)])
    emnapiMemory.setPointer(wasmMemory, result as number, value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippip */
export function napi_set_element (env: napi_env, object: napi_value, index: uint32_t, value: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    h.value[index >>> 0] = emnapiCtx.handleStore.get(value)!.value
    return envObject.getReturnStatus()
  })
}

/** @__sig ippip */
export function napi_has_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let r: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')
    r = ((index >>> 0) in v) ? 1 : 0
    emnapiMemory.setInt8(wasmMemory, result as number, r)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippip */
export function napi_get_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (h.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = envObject.ensureHandleId(v[index >>> 0])
    emnapiMemory.setPointer(wasmMemory, result as number, value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippip */
export function napi_delete_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let r: boolean

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, object)
    const h = emnapiCtx.handleStore.get(object)!
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    if (emnapiCtx.feature.supportReflect) {
      r = Reflect.deleteProperty(h.value, index >>> 0)
    } else {
      try {
        r = delete h.value[index >>> 0]
      } catch (_) {
        r = false
      }
    }
    if (result) {
      from64('result')
      emnapiMemory.setInt8(wasmMemory, result as number, r ? 1 : 0)
    }
    return envObject.getReturnStatus()
  })
}

/** @__sig ipppp */
export function napi_define_properties (
  env: napi_env,
  object: napi_value,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propPtr: number, attributes: number

  return $PREAMBLE!(env, (envObject) => {
    from64('properties')
    from64('property_count')

    property_count = property_count >>> 0

    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapiCtx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }

    let propertyName: string | symbol

    for (let i = 0; i < property_count; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      propPtr = properties + (i * (POINTER_SIZE * 8))
      const utf8Name = emnapiMemory.getPointer(wasmMemory, propPtr)
      const name = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE)
      const method = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE * 2)
      const getter = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE * 3)
      const setter = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE * 4)
      const value = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE * 5)
      attributes = emnapiMemory.getUint32(wasmMemory, propPtr + POINTER_SIZE * 6)
      const data = emnapiMemory.getPointer(wasmMemory, propPtr + POINTER_SIZE * 7)

      if (utf8Name) {
        propertyName = emnapiString.UTF8ToString(utf8Name, -1)
      } else {
        if (!name) {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
        propertyName = emnapiCtx.handleStore.get(name)!.value
        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
      }
      emnapiDefineProperty(envObject, maybeObject, propertyName, method, getter, setter, value, attributes, data)
    }
    return envObject.getReturnStatus()
  })
}

/** @__sig ipp */
export function napi_object_freeze (env: napi_env, object: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapiCtx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.freeze(maybeObject)
    return envObject.getReturnStatus()
  })
}

/** @__sig ipp */
export function napi_object_seal (env: napi_env, object: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapiCtx.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.seal(maybeObject)
    return envObject.getReturnStatus()
  })
}
