function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, object], () => {
      const h = envObject.handleStore.get(object)!
      if (!h.isObject()) {
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
    if (!h.isObject()) {
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

      if (getter !== emnapi.NULL || setter !== emnapi.NULL) {
        let localGetter: () => any
        let localSetter: (v: any) => void
        if (getter !== emnapi.NULL) {
          localGetter = emnapi.createFunction(env, emnapi.NULL, 0, getter, data)
        }
        if (setter !== emnapi.NULL) {
          localSetter = emnapi.createFunction(env, emnapi.NULL, 0, setter, data)
        }
        const desc: PropertyDescriptor = {
          configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
          enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
          get: localGetter!,
          set: localSetter!
        }
        Object.defineProperty(maybeObject, propertyName, desc)
      } else if (method !== emnapi.NULL) {
        const localMethod = emnapi.createFunction(env, emnapi.NULL, 0, method, data)
        const desc: PropertyDescriptor = {
          configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
          enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
          writable: (attributes & emnapi.napi_property_attributes.napi_writable) !== 0,
          value: localMethod
        }
        Object.defineProperty(maybeObject, propertyName, desc)
      } else {
        const desc: PropertyDescriptor = {
          configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
          enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
          writable: (attributes & emnapi.napi_property_attributes.napi_writable) !== 0,
          value: envObject.handleStore.get(value)!.value
        }
        Object.defineProperty(maybeObject, propertyName, desc)
      }
    }
    return emnapi.napi_status.napi_ok
  })
}

function napi_object_freeze (env: napi_env, object: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    const h = envObject.handleStore.get(object)!
    const maybeObject = h.value
    if (!h.isObject()) {
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
    if (!h.isObject()) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
    }
    Object.seal(maybeObject)
    return emnapi.getReturnStatus(env)
  })
}

emnapiImplement('napi_set_named_property', napi_set_named_property)
emnapiImplement('napi_define_properties', napi_define_properties)
emnapiImplement('napi_object_freeze', napi_object_freeze)
emnapiImplement('napi_object_seal', napi_object_seal)
