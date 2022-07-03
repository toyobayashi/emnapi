/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const emnapiCreateFunction: typeof $emnapiCreateFunction
function $emnapiCreateFunction<F extends (...args: any[]) => any> (envObject: emnapi.Env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p): { status: napi_status; f: F } {
  const functionName = (utf8name === NULL || length === 0) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))

  let f: F

  const makeFunction = () => function (this: any): any {
    'use strict'
    const newTarget = this && this instanceof f ? this.constructor : undefined
    const cbinfo = emnapi.CallbackInfo.create(
      envObject,
      this,
      data,
      arguments.length,
      Array.prototype.slice.call(arguments),
      newTarget
    )
    const scope = emnapi.openScope(envObject, emnapi.HandleScope)
    let r: napi_value
    try {
      r = envObject.callIntoModule((envObject) => {
        const napiValue = emnapiGetDynamicCalls.call_iii(cb, envObject.id, cbinfo.id)
        return (!napiValue) ? undefined : emnapi.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      cbinfo.dispose()
      emnapi.closeScope(envObject, scope)
      throw err
    }
    cbinfo.dispose()
    emnapi.closeScope(envObject, scope)
    return r
  }

  if (functionName === '') {
    f = makeFunction() as F
  } else {
    if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
      return { status: napi_status.napi_invalid_arg, f: undefined! }
    }
// #if DYNAMIC_EXECUTION
    if (emnapi.supportNewFunction) {
      f = (new Function('_',
        'return function ' + functionName + '(){' +
          '"use strict";' +
          'return _.apply(this,arguments);' +
        '};'
      ))(makeFunction())
    } else {
// #endif
      f = makeFunction() as F
      if (emnapi.canSetFunctionName) {
        Object.defineProperty(f, 'name', {
          value: functionName
        })
      }
// #if DYNAMIC_EXECUTION
    }
// #endif
  }

  return { status: napi_status.napi_ok, f }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiDefineProperty: typeof $emnapiDefineProperty
function $emnapiDefineProperty (envObject: emnapi.Env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
  if (getter !== NULL || setter !== NULL) {
    let localGetter: () => any
    let localSetter: (v: any) => void
    if (getter !== NULL) {
      localGetter = emnapiCreateFunction(envObject, NULL, 0, getter, data).f
    }
    if (setter !== NULL) {
      localSetter = emnapiCreateFunction(envObject, NULL, 0, setter, data).f
    }
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      get: localGetter!,
      set: localSetter!
    }
    Object.defineProperty(obj, propertyName, desc)
  } else if (method !== NULL) {
    const localMethod = emnapiCreateFunction(envObject, NULL, 0, method, data).f
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: localMethod
    }
    Object.defineProperty(obj, propertyName, desc)
  } else {
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: emnapi.handleStore.get(value)!.value
    }
    Object.defineProperty(obj, propertyName, desc)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiCreateTypedArray: typeof $emnapiCreateTypedArray
function $emnapiCreateTypedArray (envObject: emnapi.Env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t, callback: (out: ArrayBufferView) => napi_status): napi_status {
  byte_offset = byte_offset >>> 0
  length = length >>> 0
  if (size_of_element > 1) {
    if ((byte_offset) % (size_of_element) !== 0) {
      const err: RangeError & { code?: string } = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`)
      err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT'
      envObject.tryCatch.setError(err)
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
  }
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
    const err: RangeError & { code?: string } = new RangeError('Invalid typed array length')
    err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH'
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  const out = new Type(buffer, byte_offset, length)
  return callback(out)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiWrap: typeof $emnapiWrap
function $emnapiWrap (type: WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [js_object], () => {
      const value = emnapi.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      if (type === WrapType.retrievable) {
        if (value.wrapped !== 0) {
          return envObject.setLastError(napi_status.napi_invalid_arg)
        }
      } else if (type === WrapType.anonymous) {
        if (finalize_cb === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      let reference: emnapi.Reference
      if (result !== NULL) {
        if (finalize_cb === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
        reference = emnapi.Reference.create(envObject, value.id, 0, false, finalize_cb, native_object, finalize_hint)
        HEAP32[result >> 2] = reference.id
      } else {
        reference = emnapi.Reference.create(envObject, value.id, 0, true, finalize_cb, native_object, finalize_cb === NULL ? NULL : finalize_hint)
      }

      if (type === WrapType.retrievable) {
        value.wrapped = reference.id
      }
      return envObject.getReturnStatus()
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiUnwrap: typeof $emnapiUnwrap
function $emnapiUnwrap (env: napi_env, js_object: napi_value, result: void_pp, action: UnwrapAction): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [js_object], () => {
      if (action === UnwrapAction.KeepWrap) {
        if (result === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const value = emnapi.handleStore.get(js_object)!
      if (!(value.isObject() || value.isFunction())) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const referenceId = value.wrapped
      const ref = emnapi.refStore.get(referenceId)
      if (!ref) return envObject.setLastError(napi_status.napi_invalid_arg)
      if (result !== NULL) {
        HEAP32[result >> 2] = ref.data()
      }
      if (action === UnwrapAction.RemoveWrap) {
        value.wrapped = 0
        emnapi.Reference.doDelete(ref)
      }
      return envObject.getReturnStatus()
    })
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiAddName: typeof $emnapiAddName
function $emnapiAddName (ret: Array<string | number | symbol>, name: string | number | symbol, key_filter: number, conversion_mode: napi_key_conversion): void {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiGetPropertyNames: typeof $emnapiGetPropertyNames
function $emnapiGetPropertyNames (obj: object, collection_mode: napi_key_collection_mode, key_filter: number, conversion_mode: napi_key_conversion): Array<string | symbol | number> {
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
    if (collection_mode === napi_key_collection_mode.napi_key_own_only) {
      break
    }
    obj = Object.getPrototypeOf(obj)
    own = false
  } while (obj)
  const ret: Array<string | number | symbol> = []
  for (i = 0; i < props.length; i++) {
    const name = props[i].name
    if (key_filter === napi_key_filter.napi_key_all_properties) {
      emnapiAddName(ret, name, key_filter, conversion_mode)
    } else {
      if (key_filter & napi_key_filter.napi_key_skip_strings) {
        if (typeof name === 'string') continue
      }
      if (key_filter & napi_key_filter.napi_key_skip_symbols) {
        if (typeof name === 'symbol') continue
      }
      if (key_filter & napi_key_filter.napi_key_writable) {
        if (props[i].desc.writable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      if (key_filter & napi_key_filter.napi_key_enumerable) {
        if (props[i].desc.enumerable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      if (key_filter & napi_key_filter.napi_key_configurable) {
        if (props[i].desc.configurable) emnapiAddName(ret, name, key_filter, conversion_mode)
        continue
      }
      emnapiAddName(ret, name, key_filter, conversion_mode)
    }
  }
  return ret
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiSetErrorCode: typeof $emnapiSetErrorCode
function $emnapiSetErrorCode (envObject: emnapi.Env, error: Error & { code?: string }, code: napi_value, code_string: const_char_p): napi_status {
  if (code !== NULL || code_string !== NULL) {
    let codeValue: string
    if (code !== NULL) {
      codeValue = emnapi.handleStore.get(code)!.value
      if (typeof codeValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
    } else {
      codeValue = UTF8ToString(code_string)
    }
    error.code = codeValue
  }
  return napi_status.napi_ok
}

emnapiImplement('$emnapiCreateFunction', $emnapiCreateFunction, ['$emnapiGetDynamicCalls'])
emnapiImplement('$emnapiDefineProperty', $emnapiDefineProperty, ['$emnapiCreateFunction'])
emnapiImplement('$emnapiCreateTypedArray', $emnapiCreateTypedArray)
emnapiImplement('$emnapiWrap', $emnapiWrap)
emnapiImplement('$emnapiUnwrap', $emnapiUnwrap)
emnapiImplement('$emnapiAddName', $emnapiAddName)
emnapiImplement('$emnapiGetPropertyNames', $emnapiGetPropertyNames, ['$emnapiAddName'])
emnapiImplement('$emnapiSetErrorCode', $emnapiSetErrorCode)
