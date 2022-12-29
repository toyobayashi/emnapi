declare const _napi_get_all_property_names: typeof napi_get_all_property_names
function napi_get_all_property_names (
  env: napi_env,
  object: napi_value,
  key_mode: napi_key_collection_mode,
  key_filter: napi_key_filter,
  key_conversion: napi_key_conversion,
  result: Pointer<napi_value>
): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result, object], () => {
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
      if (key_mode !== napi_key_collection_mode.napi_key_include_prototypes && key_mode !== napi_key_collection_mode.napi_key_own_only) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (key_conversion !== napi_key_conversion.napi_key_keep_numbers && key_conversion !== napi_key_conversion.napi_key_numbers_to_strings) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const names = emnapiGetPropertyNames(v, key_mode, key_filter, key_conversion)
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(envObject, names, true).id
      $makeSetValue('result', 0, 'value', '*')
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
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [key, value, object], () => {
      const h = emnapiCtx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[emnapiCtx.handleStore.get(key)!.value] = emnapiCtx.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [key, result, object], () => {
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
      $from64('result')
      HEAPU8[result] = (emnapiCtx.handleStore.get(key)!.value in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [key, result, object], () => {
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
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.ensureHandleId(v[emnapiCtx.handleStore.get(key)!.value])
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [key, object], () => {
      const h = emnapiCtx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      const propertyKey = emnapiCtx.handleStore.get(key)!.value
      if (emnapiRt.supportReflect) {
        r = Reflect.deleteProperty(h.value, propertyKey)
      } else {
        try {
          r = delete h.value[propertyKey]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        $from64('result')
        HEAPU8[result] = r ? 1 : 0
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_own_property (env: napi_env, object: napi_value, key: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [key, result, object], () => {
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
      const r = Object.prototype.hasOwnProperty.call(v, emnapiCtx.handleStore.get(key)!.value)
      $from64('result')
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_named_property (env: napi_env, object: napi_value, cname: const_char_p, value: napi_value): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, object], () => {
      const h = emnapiCtx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      if (!cname) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      $from64('cname')
      emnapiCtx.handleStore.get(object)!.value[UTF8ToString(cname)] = emnapiCtx.handleStore.get(value)!.value
      return napi_status.napi_ok
    })
  })
}

function napi_has_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result, object], () => {
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
      $from64('utf8name')
      $from64('result')

      const r = UTF8ToString(utf8name) in v
      HEAPU8[result] = r ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_named_property (env: napi_env, object: napi_value, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result, object], () => {
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
      $from64('utf8name')
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.ensureHandleId(v[UTF8ToString(utf8name)])
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_set_element (env: napi_env, object: napi_value, index: uint32_t, value: napi_value): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, object], () => {
      const h = emnapiCtx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      h.value[index >>> 0] = emnapiCtx.handleStore.get(value)!.value
      return envObject.getReturnStatus()
    })
  })
}

function napi_has_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result, object], () => {
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
      $from64('result')
      HEAPU8[result] = ((index >>> 0) in v) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result, object], () => {
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
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.ensureHandleId(v[index >>> 0])
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_delete_element (env: napi_env, object: napi_value, index: uint32_t, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [object], () => {
      const h = emnapiCtx.handleStore.get(object)!
      if (!(h.isObject() || h.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      let r: boolean
      if (emnapiRt.supportReflect) {
        r = Reflect.deleteProperty(h.value, index >>> 0)
      } else {
        try {
          r = delete h.value[index >>> 0]
        } catch (_) {
          r = false
        }
      }
      if (result) {
        $from64('result')
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
  return emnapiCtx.preamble(env, (envObject) => {
    $from64('properties')
    $from64('property_count')

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
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const propPtr = properties + (i * ($POINTER_SIZE * 8))
      const utf8Name = $makeGetValue('propPtr', 0, '*')
      const name = $makeGetValue('propPtr', POINTER_SIZE, '*')
      const method = $makeGetValue('propPtr', POINTER_SIZE * 2, '*')
      const getter = $makeGetValue('propPtr', POINTER_SIZE * 3, '*')
      const setter = $makeGetValue('propPtr', POINTER_SIZE * 4, '*')
      const value = $makeGetValue('propPtr', POINTER_SIZE * 5, '*')
      const attributes = $makeGetValue('propPtr', POINTER_SIZE * 6, POINTER_WASM_TYPE) as number
      $from64('attributes')
      const data = $makeGetValue('propPtr', POINTER_SIZE * 7, '*')

      if (utf8Name) {
        propertyName = UTF8ToString(utf8Name)
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
    return napi_status.napi_ok
  })
}

function napi_object_freeze (env: napi_env, object: napi_value): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
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

function napi_object_seal (env: napi_env, object: napi_value): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
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

emnapiImplement('napi_get_all_property_names', 'ippiiip', napi_get_all_property_names, ['$emnapiGetPropertyNames'])
emnapiImplement('napi_get_property_names', 'ippp', napi_get_property_names, ['napi_get_all_property_names'])
emnapiImplement('napi_set_property', 'ipppp', napi_set_property)
emnapiImplement('napi_has_property', 'ipppp', napi_has_property)
emnapiImplement('napi_get_property', 'ipppp', napi_get_property)
emnapiImplement('napi_delete_property', 'ipppp', napi_delete_property)
emnapiImplement('napi_has_own_property', 'ipppp', napi_has_own_property)
emnapiImplement('napi_set_named_property', 'ipppp', napi_set_named_property)
emnapiImplement('napi_has_named_property', 'ipppp', napi_has_named_property)
emnapiImplement('napi_get_named_property', 'ipppp', napi_get_named_property)
emnapiImplement('napi_set_element', 'ippip', napi_set_element)
emnapiImplement('napi_has_element', 'ippip', napi_has_element)
emnapiImplement('napi_get_element', 'ippip', napi_get_element)
emnapiImplement('napi_delete_element', 'ippip', napi_delete_element)
emnapiImplement('napi_define_properties', 'ipppp', napi_define_properties, ['$emnapiDefineProperty'])
emnapiImplement('napi_object_freeze', 'ipp', napi_object_freeze)
emnapiImplement('napi_object_seal', 'ipp', napi_object_seal)
