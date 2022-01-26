declare const emnapiCreateFunction: typeof $emnapiCreateFunction
function $emnapiCreateFunction<F extends (...args: any[]) => any> (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p): F {
  const envObject = emnapi.envStore.get(env)!
  const f = (() => function (this: any): any {
    'use strict'
    const callbackInfo = {
      _this: this,
      _data: data,
      _length: arguments.length,
      _args: Array.prototype.slice.call(arguments),
      _newTarget: new.target,
      _isConstructCall: !!new.target
    }
    return envObject.callIntoModule((envObject, scope) => {
      const cbinfoHandle = scope.add(callbackInfo)
      const napiValue = envObject.call_iii(cb, env, cbinfoHandle.id)
      return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
    })
  })()

  if (emnapi.canSetFunctionName) {
    Object.defineProperty(f, 'name', {
      value: (utf8name === emnapi.NULL || length === 0) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))
    })
  }

  return f as F
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiDefineProperty: typeof $emnapiDefineProperty
function $emnapiDefineProperty (env: napi_env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
  const envObject = emnapi.envStore.get(env)!
  if (getter !== emnapi.NULL || setter !== emnapi.NULL) {
    let localGetter: () => any
    let localSetter: (v: any) => void
    if (getter !== emnapi.NULL) {
      localGetter = emnapiCreateFunction(env, emnapi.NULL, 0, getter, data)
    }
    if (setter !== emnapi.NULL) {
      localSetter = emnapiCreateFunction(env, emnapi.NULL, 0, setter, data)
    }
    const desc: PropertyDescriptor = {
      configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
      get: localGetter!,
      set: localSetter!
    }
    Object.defineProperty(obj, propertyName, desc)
  } else if (method !== emnapi.NULL) {
    const localMethod = emnapiCreateFunction(env, emnapi.NULL, 0, method, data)
    const desc: PropertyDescriptor = {
      configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & emnapi.napi_property_attributes.napi_writable) !== 0,
      value: localMethod
    }
    Object.defineProperty(obj, propertyName, desc)
  } else {
    const desc: PropertyDescriptor = {
      configurable: (attributes & emnapi.napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & emnapi.napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & emnapi.napi_property_attributes.napi_writable) !== 0,
      value: envObject.handleStore.get(value)!.value
    }
    Object.defineProperty(obj, propertyName, desc)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiCreateTypedArray: typeof $emnapiCreateTypedArray
function $emnapiCreateTypedArray (env: napi_env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t, callback: (out: ArrayBufferView) => emnapi.napi_status): emnapi.napi_status {
  byte_offset = byte_offset >>> 0
  length = length >>> 0
  const envObject = emnapi.envStore.get(env)!
  if (size_of_element > 1) {
    if ((byte_offset) % (size_of_element) !== 0) {
      const err: RangeError & { code?: string } = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`)
      err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT'
      envObject.tryCatch.setError(err)
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
    }
  }
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
    const err: RangeError & { code?: string } = new RangeError('Invalid typed array length')
    err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH'
    envObject.tryCatch.setError(err)
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  }
  const out = new Type(buffer, byte_offset, length)
  return callback(out)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiWrap: typeof $emnapiWrap
function $emnapiWrap (type: emnapi.WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [js_object], () => {
      const value = envObject.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }

      if (type === emnapi.WrapType.retrievable) {
        if (value.wrapped !== 0) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
      } else if (type === emnapi.WrapType.anonymous) {
        if (finalize_cb === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }

      let reference: emnapi.Reference
      if (result !== emnapi.NULL) {
        if (finalize_cb === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        reference = emnapi.Reference.create(env, value.id, 0, false, finalize_cb, native_object, finalize_hint)
        HEAP32[result >> 2] = reference.id
      } else {
        reference = emnapi.Reference.create(env, value.id, 0, true, finalize_cb, native_object, finalize_cb === emnapi.NULL ? emnapi.NULL : finalize_hint)
      }

      if (type === emnapi.WrapType.retrievable) {
        value.wrapped = reference.id
      }
      return emnapi.getReturnStatus(env)
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiUnwrap: typeof $emnapiUnwrap
function $emnapiUnwrap (env: napi_env, js_object: napi_value, result: void_pp, action: emnapi.UnwrapAction): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [js_object], () => {
      if (action === emnapi.UnwrapAction.KeepWrap) {
        if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const value = envObject.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const referenceId = value.wrapped
      const ref = envObject.refStore.get(referenceId)
      if (!ref) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      if (result !== emnapi.NULL) {
        HEAP32[result >> 2] = ref.data()
      }
      if (action === emnapi.UnwrapAction.RemoveWrap) {
        value.wrapped = 0
        emnapi.Reference.doDelete(ref)
      }
      return emnapi.getReturnStatus(env)
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiAddName: typeof $emnapiAddName
function $emnapiAddName (ret: Array<string | number | symbol>, name: string | number | symbol, key_filter: number, conversion_mode: emnapi.napi_key_conversion): void {
  if (ret.indexOf(name) !== -1) return
  if (conversion_mode === emnapi.napi_key_conversion.napi_key_keep_numbers) {
    ret.push(name)
  } else if (conversion_mode === emnapi.napi_key_conversion.napi_key_numbers_to_strings) {
    const realName = typeof name === 'number' ? String(name) : name
    if (typeof realName === 'string') {
      if (!(key_filter & emnapi.napi_key_filter.napi_key_skip_strings)) {
        ret.push(realName)
      }
    } else {
      ret.push(realName)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiGetPropertyNames: typeof $emnapiGetPropertyNames
function $emnapiGetPropertyNames (obj: object, collection_mode: emnapi.napi_key_collection_mode, key_filter: number, conversion_mode: emnapi.napi_key_conversion): Array<string | symbol | number> {
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
        own: own
      })
    }
    for (i = 0; i < symbols.length; i++) {
      props.push({
        name: symbols[i],
        desc: Object.getOwnPropertyDescriptor(obj, symbols[i])!,
        own: own
      })
    }
    if (collection_mode === emnapi.napi_key_collection_mode.napi_key_own_only) {
      break
    }
    obj = Object.getPrototypeOf(obj)
    own = false
  } while (obj)
  const ret: Array<string | number | symbol> = []
  for (i = 0; i < props.length; i++) {
    const name = props[i].name
    if (key_filter === emnapi.napi_key_filter.napi_key_all_properties) {
      emnapiAddName(ret, name, key_filter, conversion_mode)
    } else {
      if (key_filter & emnapi.napi_key_filter.napi_key_skip_strings) {
        if (typeof name === 'string') continue
      }
      if (key_filter & emnapi.napi_key_filter.napi_key_skip_symbols) {
        if (typeof name === 'symbol') continue
      }
      if (key_filter & emnapi.napi_key_filter.napi_key_writable) {
        if (props[i].desc.writable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      if (key_filter & emnapi.napi_key_filter.napi_key_enumerable) {
        if (props[i].desc.enumerable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      if (key_filter & emnapi.napi_key_filter.napi_key_configurable) {
        if (props[i].desc.configurable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      emnapiAddName(ret, name, key_filter, conversion_mode)
    }
  }
  return ret
}

emnapiImplement('$emnapiCreateFunction', $emnapiCreateFunction)
emnapiImplement('$emnapiDefineProperty', $emnapiDefineProperty, ['$emnapiCreateFunction'])
emnapiImplement('$emnapiCreateTypedArray', $emnapiCreateTypedArray)
emnapiImplement('$emnapiWrap', $emnapiWrap)
emnapiImplement('$emnapiUnwrap', $emnapiUnwrap)
emnapiImplement('$emnapiAddName', $emnapiAddName)
emnapiImplement('$emnapiGetPropertyNames', $emnapiGetPropertyNames, ['$emnapiAddName'])
