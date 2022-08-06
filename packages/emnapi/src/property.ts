declare const _napi_get_all_property_names: typeof napi_get_all_property_names
function napi_get_all_property_names (
  env: napi_env,
  object: napi_value,
  key_mode: napi_key_collection_mode,
  key_filter: napi_key_filter,
  key_conversion: napi_key_conversion,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (key_mode !== napi_key_collection_mode.napi_key_include_prototypes && key_mode !== napi_key_collection_mode.napi_key_own_only) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (key_conversion !== napi_key_conversion.napi_key_keep_numbers && key_conversion !== napi_key_conversion.napi_key_numbers_to_strings) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const names = emnapiGetPropertyNames(v, key_mode, key_filter, key_conversion)
      // #if MEMORY64
      result = Number(result)
      // #endif
      setValue(result, emnapi.addToCurrentScope(envObject, names).id, '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property_names (env: napi_env, object: napi_value, result: Pointer<napi_value>): napi_status {
  return _napi_get_all_property_names(
    env,
    object,
    napi_key_collection_mode.napi_key_include_prototypes,
    napi_key_filter.napi_key_enumerable | napi_key_filter.napi_key_skip_symbols,
    napi_key_conversion.napi_key_numbers_to_strings,
    result
  )
}

function napi_set_property (env: napi_env, object: napi_value, key: napi_value, value: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, value, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[emnapi.handleStore.get(key)!.value] = emnapi.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU8[result] = (emnapi.handleStore.get(key)!.value in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      setValue(result, envObject.ensureHandleId(v[emnapi.handleStore.get(key)!.value]), '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      const propertyKey = emnapi.handleStore.get(key)!.value
      if (emnapi.supportReflect) {
        r = Reflect.deleteProperty(h.value, propertyKey)
      } else {
        try {
          r = delete h.value[propertyKey]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        // #if MEMORY64
        result = Number(result)
        // #endif
        HEAPU8[result] = r ? 1 : 0
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_own_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const prop = emnapi.handleStore.get(key)!.value
      if (typeof prop !== 'string' && typeof prop !== 'symbol') {
        return envObject.setLastError(napi_status.napi_name_expected)
      }
      const r = Object.prototype.hasOwnProperty.call(v, emnapi.handleStore.get(key)!.value)
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (!name) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      // #if MEMORY64
      name = Number(name)
      // #endif
      emnapi.handleStore.get(object)!.value[UTF8ToString(name)] = emnapi.handleStore.get(value)!.value
      return napi_status.napi_ok
    })
  })
}

function napi_has_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      if (!utf8name) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      utf8name = Number(utf8name)
      result = Number(result)
      // #endif
      const r = UTF8ToString(utf8name) in v
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      if (!utf8name) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      utf8name = Number(utf8name)
      result = Number(result)
      // #endif
      setValue(result, envObject.ensureHandleId(v[UTF8ToString(utf8name)]), '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_element (env: napi_env, object: napi_value, index: uint32_t, value: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[index >>> 0] = emnapi.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU8[result] = ((index >>> 0) in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (h.value == null) {
        throw new TypeError('Cannot convert undefined or null to object')
      }
      let v: any
      try {
        v = h.isObject() || h.isFunction() ? h.value : Object(h.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      setValue(result, envObject.ensureHandleId(v[index >>> 0]), '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      if (emnapi.supportReflect) {
        r = Reflect.deleteProperty(h.value, index >>> 0)
      } else {
        try {
          r = delete h.value[index >>> 0]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        // #if MEMORY64
        result = Number(result)
        // #endif
        HEAPU8[result] = r ? 1 : 0
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_define_properties (
  env: napi_env,
  object: napi_value,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    // #if MEMORY64
    properties = Number(properties)
    property_count = Number(property_count) >>> 0
    // #else
    property_count = property_count >>> 0
    // #endif
    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapi.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    let propPtr: number
    let utf8Name: number
    let name: number
    let method: number
    let getter: number
    let setter: number
    let value: number
    let attributes: number
    let data: number
    let propertyName: string | symbol

    for (let i = 0; i < property_count; i++) {
      // #if MEMORY64
      propPtr = properties + (i * 64)
      utf8Name = getValue(propPtr, '*')
      name = getValue(propPtr + 8, '*')
      method = getValue(propPtr + 16, '*')
      getter = getValue(propPtr + 24, '*')
      setter = getValue(propPtr + 32, '*')
      value = getValue(propPtr + 40, '*')
      attributes = Number(HEAP64[(propPtr + 48) >> 3])
      data = getValue(propPtr + 56, '*')
      // #else
      propPtr = properties + (i * 32)
      utf8Name = getValue(propPtr, '*')
      name = getValue(propPtr + 4, '*')
      method = getValue(propPtr + 8, '*')
      getter = getValue(propPtr + 12, '*')
      setter = getValue(propPtr + 16, '*')
      value = getValue(propPtr + 20, '*')
      attributes = HEAP32[(propPtr + 24) >> 2]
      data = getValue(propPtr + 28, '*')
      // #endif

      if (utf8Name) {
        propertyName = UTF8ToString(utf8Name)
      } else {
        if (!name) {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
        propertyName = emnapi.handleStore.get(name)!.value
        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
      }
      emnapiDefineProperty(envObject, maybeObject, propertyName, method, getter, setter, value, attributes, data)
    }
    return napi_status.napi_ok
  })
}

function napi_object_freeze (env: napi_env, object: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapi.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.freeze(maybeObject)
    return envObject.getReturnStatus()
  })
}

function napi_object_seal (env: napi_env, object: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!object) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapi.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    Object.seal(maybeObject)
    return envObject.getReturnStatus()
  })
}

emnapiImplement('napi_get_all_property_names', napi_get_all_property_names, ['$emnapiGetPropertyNames'])
emnapiImplement('napi_get_property_names', napi_get_property_names, ['napi_get_all_property_names'])
emnapiImplement('napi_set_property', napi_set_property)
emnapiImplement('napi_has_property', napi_has_property)
emnapiImplement('napi_get_property', napi_get_property)
emnapiImplement('napi_delete_property', napi_delete_property)
emnapiImplement('napi_has_own_property', napi_has_own_property)
emnapiImplement('napi_set_named_property', napi_set_named_property)
emnapiImplement('napi_has_named_property', napi_has_named_property)
emnapiImplement('napi_get_named_property', napi_get_named_property)
emnapiImplement('napi_set_element', napi_set_element)
emnapiImplement('napi_has_element', napi_has_element)
emnapiImplement('napi_get_element', napi_get_element)
emnapiImplement('napi_delete_element', napi_delete_element)
emnapiImplement('napi_define_properties', napi_define_properties, ['$emnapiDefineProperty'])
emnapiImplement('napi_object_freeze', napi_object_freeze)
emnapiImplement('napi_object_seal', napi_object_seal)
