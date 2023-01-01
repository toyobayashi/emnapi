function napi_define_class (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>,
  result: Pointer<napi_value>
// @ts-expect-error
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propPtr: number, valueHandleId: number, attributes: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, constructor)
    $from64('length')
    $from64('properties')
    $from64('property_count')

    length = length >>> 0
    property_count = property_count >>> 0

    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (!((length === 0xffffffff) || (length <= 2147483647)) || (!utf8name)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data)
    if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
    const F = fresult.f

    let propertyName: string | symbol

    for (let i = 0; i < property_count; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      propPtr = properties + (i * ($POINTER_SIZE * 8))
      const utf8Name = $makeGetValue('propPtr', 0, '*')
      const name = $makeGetValue('propPtr', POINTER_SIZE, '*')
      const method = $makeGetValue('propPtr', POINTER_SIZE * 2, '*')
      const getter = $makeGetValue('propPtr', POINTER_SIZE * 3, '*')
      const setter = $makeGetValue('propPtr', POINTER_SIZE * 4, '*')
      const value = $makeGetValue('propPtr', POINTER_SIZE * 5, '*')
      attributes = $makeGetValue('propPtr', POINTER_SIZE * 6, POINTER_WASM_TYPE) as number
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

      if ((attributes & napi_property_attributes.napi_static) !== 0) {
        emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data)
        continue
      }
      emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const valueHandle = emnapiCtx.addToCurrentScope(F)
    valueHandleId = valueHandle.id
    $from64('result')
    $makeSetValue('result', 0, 'valueHandleId', '*')
    return envObject.getReturnStatus()
  })
}

function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  if (!emnapiRt.supportFinalizer) {
    if (finalize_cb) {
      $PREAMBLE!(env, () => {
        throw new emnapiRt.NotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)')
      })
    }
    if (result) {
      $PREAMBLE!(env, () => {
        throw new emnapiRt.NotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)')
      })
    }
  }
  return emnapiWrap(WrapType.retrievable, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

function napi_unwrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.KeepWrap)
}

function napi_remove_wrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.RemoveWrap)
}

// @ts-expect-error
function napi_type_tag_object (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    $from64('type_tag')
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const binding = emnapiRt.HandleStore.getObjectBinding(value.value)
    if (binding.tag !== null) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    binding.tag = [
      HEAPU32[type_tag >> 2],
      HEAPU32[(type_tag + 4) >> 2],
      HEAPU32[(type_tag + 8) >> 2],
      HEAPU32[(type_tag + 12) >> 2]
    ]

    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_check_object_type_tag (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>, result: Pointer<bool>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (!result) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    let ret = true
    const binding = emnapiRt.HandleStore.getObjectBinding(value.value)
    if (binding.tag !== null) {
      $from64('type_tag')
      for (let i = 0; i < 4; i++) {
        if (HEAPU32[(type_tag + (i * 4)) >> 2] !== binding.tag[i]) {
          ret = false
          break
        }
      }
    } else {
      ret = false
    }

    $from64('result')
    HEAPU8[result] = ret ? 1 : 0

    return envObject.getReturnStatus()
  })
}

function napi_add_finalizer (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  if (!emnapiRt.supportFinalizer) {
    $PREAMBLE!(env, () => {
      throw new emnapiRt.NotSupportWeakRefError('napi_add_finalizer', 'This API is unavailable')
    })
  }
  return emnapiWrap(WrapType.anonymous, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

emnapiImplement('napi_define_class', 'ipppppppp', napi_define_class, ['$emnapiCreateFunction', '$emnapiDefineProperty'])
emnapiImplement('napi_wrap', 'ipppppp', napi_wrap, ['$emnapiWrap'])
emnapiImplement('napi_unwrap', 'ippp', napi_unwrap, ['$emnapiUnwrap'])
emnapiImplement('napi_remove_wrap', 'ippp', napi_remove_wrap, ['$emnapiUnwrap'])
emnapiImplement('napi_type_tag_object', 'ippp', napi_type_tag_object)
emnapiImplement('napi_check_object_type_tag', 'ipppp', napi_check_object_type_tag)
emnapiImplement('napi_add_finalizer', 'ipppppp', napi_add_finalizer, ['$emnapiWrap'])
