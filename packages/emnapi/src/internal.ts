/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const emnapiCreateFunction: typeof _$emnapiCreateFunction
function _$emnapiCreateFunction<F extends (...args: any[]) => any> (envObject: emnapi.Env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p): { status: napi_status; f: F } {
  $from64('length')
  $from64('utf8name')

  const functionName = (!utf8name || !length) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))

  let f: F

  const makeFunction = () => function (this: any): any {
    'use strict'
    emnapiRt.CallbackInfo.push(this, data, arguments, f)
    const scope = emnapiCtx.openScope(envObject)
    try {
      return envObject.callIntoModule((envObject) => {
        const napiValue = $makeDynCall('ppp', 'cb')(envObject.id, 0)
        return (!napiValue) ? undefined : emnapiCtx.handleStore.get(napiValue)!.value
      })
    } finally {
      emnapiRt.CallbackInfo.pop()
      emnapiCtx.closeScope(envObject, scope)
    }
  }

  if (functionName === '') {
    f = makeFunction() as F
    return { status: napi_status.napi_ok, f }
  }

  if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
    return { status: napi_status.napi_invalid_arg, f: undefined! }
  }

// #if DYNAMIC_EXECUTION
    if (emnapiRt.supportNewFunction) {
      f = (new Function('_',
        'return function ' + functionName + '(){' +
          '"use strict";' +
          'return _.apply(this,arguments);' +
        '};'
      ))(makeFunction())
    } else {
      f = makeFunction() as F
      if (emnapiRt.canSetFunctionName) Object.defineProperty(f, 'name', { value: functionName })
    }
// #else
    f = makeFunction() as F
    if (emnapiRt.canSetFunctionName) Object.defineProperty(f, 'name', { value: functionName })
// #endif
  return { status: napi_status.napi_ok, f }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiDefineProperty: typeof _$emnapiDefineProperty
function _$emnapiDefineProperty (envObject: emnapi.Env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
  if (getter || setter) {
    let localGetter: () => any
    let localSetter: (v: any) => void
    if (getter) {
      localGetter = emnapiCreateFunction(envObject, 0, 0, getter, data).f
    }
    if (setter) {
      localSetter = emnapiCreateFunction(envObject, 0, 0, setter, data).f
    }
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      get: localGetter!,
      set: localSetter!
    }
    Object.defineProperty(obj, propertyName, desc)
  } else if (method) {
    const localMethod = emnapiCreateFunction(envObject, 0, 0, method, data).f
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
      value: emnapiCtx.handleStore.get(value)!.value
    }
    Object.defineProperty(obj, propertyName, desc)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiCreateTypedArray: typeof _$emnapiCreateTypedArray
function _$emnapiCreateTypedArray (envObject: emnapi.Env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t, callback: (out: ArrayBufferView) => napi_status): napi_status {
  $from64('byte_offset')
  $from64('length')
  $from64('size_of_element')

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
declare const emnapiWrap: typeof _$emnapiWrap
// @ts-expect-error
function _$emnapiWrap (type: WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let referenceId: number
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, js_object)
    const value = emnapiCtx.handleStore.get(js_object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    if (type === WrapType.retrievable) {
      if (emnapiRt.HandleStore.getObjectBinding(value.value).wrapped !== 0) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
    } else if (type === WrapType.anonymous) {
      if (!finalize_cb) return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    let reference: emnapi.Reference
    if (result) {
      if (!finalize_cb) return envObject.setLastError(napi_status.napi_invalid_arg)
      reference = emnapiRt.Reference.create(envObject, value.id, 0, emnapiRt.Ownership.kUserland, finalize_cb, native_object, finalize_hint)
      $from64('result')
      referenceId = reference.id
      $makeSetValue('result', 0, 'referenceId', '*')
    } else {
      reference = emnapiRt.Reference.create(envObject, value.id, 0, emnapiRt.Ownership.kRuntime, finalize_cb, native_object, !finalize_cb ? finalize_cb : finalize_hint)
    }

    if (type === WrapType.retrievable) {
      emnapiRt.HandleStore.getObjectBinding(value.value).wrapped = reference.id
    }
    return envObject.getReturnStatus()
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiUnwrap: typeof _$emnapiUnwrap
// @ts-expect-error
function _$emnapiUnwrap (env: napi_env, js_object: napi_value, result: void_pp, action: UnwrapAction): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let data: number
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, js_object)
    if (action === UnwrapAction.KeepWrap) {
      if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(js_object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const binding = emnapiRt.HandleStore.getObjectBinding(value.value)
    const referenceId = binding.wrapped
    const ref = emnapiCtx.refStore.get(referenceId)
    if (!ref) return envObject.setLastError(napi_status.napi_invalid_arg)
    if (result) {
      $from64('result')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data = ref.data()
      $makeSetValue('result', 0, 'data', '*')
    }
    if (action === UnwrapAction.RemoveWrap) {
      binding.wrapped = 0
      if (ref.ownership() === emnapiRt.Ownership.kUserland) {
        // When the wrap is been removed, the finalizer should be reset.
        ref.resetFinalizer()
      } else {
        ref.dispose()
      }
    }
    return envObject.getReturnStatus()
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const emnapiAddName: typeof _$emnapiAddName
function _$emnapiAddName (ret: Array<string | number | symbol>, name: string | number | symbol, key_filter: number, conversion_mode: napi_key_conversion): void {
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
declare const emnapiGetPropertyNames: typeof _$emnapiGetPropertyNames
function _$emnapiGetPropertyNames (obj: object, collection_mode: napi_key_collection_mode, key_filter: number, conversion_mode: napi_key_conversion): Array<string | symbol | number> {
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
    if (collection_mode === napi_key_collection_mode.napi_key_own_only) {
      break
    }
    obj = Object.getPrototypeOf(obj)
    own = false
  } while (obj)
  const ret: Array<string | number | symbol> = []
  for (i = 0; i < props.length; i++) {
    const prop = props[i]
    const name = prop.name
    const desc = prop.desc
    if (key_filter === napi_key_filter.napi_key_all_properties) {
      emnapiAddName(ret, name, key_filter, conversion_mode)
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
        emnapiAddName(ret, name, key_filter, conversion_mode)
      }
    }
  }
  return ret
}

emnapiImplement('$emnapiCreateFunction', undefined, _$emnapiCreateFunction)
emnapiImplement('$emnapiDefineProperty', undefined, _$emnapiDefineProperty, ['$emnapiCreateFunction'])
emnapiImplement('$emnapiCreateTypedArray', undefined, _$emnapiCreateTypedArray)
emnapiImplement('$emnapiWrap', undefined, _$emnapiWrap)
emnapiImplement('$emnapiUnwrap', undefined, _$emnapiUnwrap)
emnapiImplement('$emnapiAddName', undefined, _$emnapiAddName)
emnapiImplement('$emnapiGetPropertyNames', undefined, _$emnapiGetPropertyNames, ['$emnapiAddName'])
