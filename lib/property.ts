declare const _napi_get_all_property_names: typeof napi_get_all_property_names
function napi_get_all_property_names (
  env: napi_env,
  object: napi_value,
  key_mode: emnapi.napi_key_collection_mode,
  key_filter: emnapi.napi_key_filter,
  key_conversion: emnapi.napi_key_conversion,
  result: Pointer<napi_value>
): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      if (key_mode !== emnapi.napi_key_collection_mode.napi_key_include_prototypes && key_mode !== emnapi.napi_key_collection_mode.napi_key_own_only) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      if (key_conversion !== emnapi.napi_key_conversion.napi_key_keep_numbers && key_conversion !== emnapi.napi_key_conversion.napi_key_numbers_to_strings) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const names = emnapiGetPropertyNames(h.value, key_mode, key_filter, key_conversion)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(names).id
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_get_property_names (env: napi_env, object: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return _napi_get_all_property_names(
    env,
    object,
    emnapi.napi_key_collection_mode.napi_key_include_prototypes,
    emnapi.napi_key_filter.napi_key_enumerable | emnapi.napi_key_filter.napi_key_skip_symbols,
    emnapi.napi_key_conversion.napi_key_numbers_to_strings,
    result
  )
}

function napi_set_property (env: napi_env, object: napi_value, key: napi_value, value: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [key, value, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      h.value[envObject.handleStore.get(key)!.value] = envObject.handleStore.get(value)!.value
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_has_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [key, result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      HEAPU8[result] = (envObject.handleStore.get(key)!.value in h.value) ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_get_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [key, result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[envObject.handleStore.get(key)!.value])
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_delete_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [key, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      const r = delete h.value[envObject.handleStore.get(key)!.value]
      if (result !== emnapi.NULL) {
        HEAPU8[result] = r ? 1 : 0
      }
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_has_own_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [key, result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      const prop = envObject.handleStore.get(key)!.value
      if (typeof prop !== 'string' && typeof prop !== 'symbol') {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_name_expected)
      }
      const r = Object.prototype.hasOwnProperty.call(h.value, envObject.handleStore.get(key)!.value)
      HEAPU8[result] = r ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      if (name === emnapi.NULL) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      envObject.handleStore.get(object)!.value[UTF8ToString(name)] = envObject.handleStore.get(value)!.value
      return emnapi.napi_status.napi_ok
    })
  })
}

function napi_has_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, object], () => {
      if (utf8name === emnapi.NULL) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      const r = UTF8ToString(utf8name) in h.value
      HEAPU8[result] = r ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_get_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, object], () => {
      if (utf8name === emnapi.NULL) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[UTF8ToString(utf8name)])
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_set_element (env: napi_env, object: napi_value, index: uint32_t, value: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      h.value[index >>> 0] = envObject.handleStore.get(value)!.value
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_has_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      HEAPU8[result] = ((index >>> 0) in h.value) ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_get_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(h.value[index >>> 0])
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_delete_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [object], () => {
      const h = envObject.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      const r = delete h.value[index >>> 0]
      if (result !== emnapi.NULL) {
        HEAPU8[result] = r ? 1 : 0
      }
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_define_properties (
  env: napi_env,
  object: napi_value,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>
): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (property_count > 0) {
      if (properties === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    }
    if (object === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    const h = envObject.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
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
      if (utf8Name !== emnapi.NULL) {
        propertyName = UTF8ToString(utf8Name)
      } else {
        if (name === emnapi.NULL) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_name_expected)
        }
        propertyName = envObject.handleStore.get(name)!.value
        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_name_expected)
        }
      }
      emnapiDefineProperty(env, maybeObject, propertyName, method, getter, setter, value, attributes, data)
    }
    return emnapi.napi_status.napi_ok
  })
}

function napi_object_freeze (env: napi_env, object: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    const h = envObject.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
    }
    Object.freeze(maybeObject)
    return emnapi.getReturnStatus(env)
  })
}

function napi_object_seal (env: napi_env, object: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    const h = envObject.handleStore.get(object)!
    const maybeObject = h.value
    if (!(h.isObject() || h.isFunction())) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
    }
    Object.seal(maybeObject)
    return emnapi.getReturnStatus(env)
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
