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
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (key_mode !== napi_key_collection_mode.napi_key_include_prototypes && key_mode !== napi_key_collection_mode.napi_key_own_only) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (key_conversion !== napi_key_conversion.napi_key_keep_numbers && key_conversion !== napi_key_conversion.napi_key_numbers_to_strings) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const names = emnapiGetPropertyNames(h.value, key_mode, key_filter, key_conversion)
      HEAP32[result >> 2] = emnapi.addToCurrentScope(envObject, names).id
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
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      HEAPU8[result] = (emnapi.handleStore.get(key)!.value in h.value) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [key, result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[emnapi.handleStore.get(key)!.value])
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
      const r = delete h.value[emnapi.handleStore.get(key)!.value]
      if (result !== NULL) {
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
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const prop = emnapi.handleStore.get(key)!.value
      if (typeof prop !== 'string' && typeof prop !== 'symbol') {
        return envObject.setLastError(napi_status.napi_name_expected)
      }
      const r = Object.prototype.hasOwnProperty.call(h.value, emnapi.handleStore.get(key)!.value)
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
      if (name === NULL) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      emnapi.handleStore.get(object)!.value[UTF8ToString(name)] = emnapi.handleStore.get(value)!.value
      return napi_status.napi_ok
    })
  })
}

function napi_has_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      if (utf8name === NULL) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const r = UTF8ToString(utf8name) in h.value
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      if (utf8name === NULL) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[UTF8ToString(utf8name)])
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
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      HEAPU8[result] = ((index >>> 0) in h.value) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, object], () => {
      const h = emnapi.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[index >>> 0])
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
      const r = delete h.value[index >>> 0]
      if (result !== NULL) {
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
    if (property_count > 0) {
      if (properties === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (object === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const h = emnapi.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    for (let i = 0; i < property_count; i++) {
      const propPtr = properties + (i * 32)

      const utf8Name = HEAP32[propPtr >> 2]
      const name = HEAP32[propPtr + 4 >> 2]
      const method = HEAP32[propPtr + 8 >> 2]
      const getter = HEAP32[propPtr + 12 >> 2]
      const setter = HEAP32[propPtr + 16 >> 2]
      const value = HEAP32[propPtr + 20 >> 2]
      const attributes = HEAP32[propPtr + 24 >> 2]
      const data = HEAP32[propPtr + 28 >> 2]
      let propertyName: string | symbol
      if (utf8Name !== NULL) {
        propertyName = UTF8ToString(utf8Name)
      } else {
        if (name === NULL) {
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
    if (object === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
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
    if (object === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
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
