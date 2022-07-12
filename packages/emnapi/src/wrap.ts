function napi_define_class (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>,
  result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, constructor], () => {
      property_count = property_count >>> 0
      length = length >>> 0
      if (property_count > 0) {
        if (properties === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (utf8name === NULL)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const F = fresult.f

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

        if ((attributes & napi_property_attributes.napi_static) !== 0) {
          emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data)
          continue
        }
        emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data)
      }

      const valueHandle = emnapi.addToCurrentScope(envObject, F)
      HEAP32[result >> 2] = valueHandle.id
      return envObject.getReturnStatus()
    })
  })
}

function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  if (!emnapi.supportFinalizer) {
    if (finalize_cb) {
      return emnapi.preamble(env, () => {
        throw new emnapi.NotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)')
      })
    }
    if (result) {
      return emnapi.preamble(env, () => {
        throw new emnapi.NotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)')
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

function napi_type_tag_object (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === NULL) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapi.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (type_tag === NULL) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (value.tag !== null) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    value.tag = [
      HEAPU32[type_tag >> 2],
      HEAPU32[(type_tag + 4) >> 2],
      HEAPU32[(type_tag + 8) >> 2],
      HEAPU32[(type_tag + 12) >> 2]
    ]

    return envObject.getReturnStatus()
  })
}

function napi_check_object_type_tag (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>, result: Pointer<bool>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === NULL) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapi.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (type_tag === NULL) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (result === NULL) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    let ret = true
    if (value.tag !== null) {
      for (let i = 0; i < 4; i++) {
        if (HEAPU32[(type_tag + (i * 4)) >> 2] !== value.tag[i]) {
          ret = false
          break
        }
      }
    } else {
      ret = false
    }

    HEAPU8[result] = ret ? 1 : 0

    return envObject.getReturnStatus()
  })
}

function napi_add_finalizer (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  if (!emnapi.supportFinalizer) {
    return emnapi.preamble(env, () => {
      throw new emnapi.NotSupportWeakRefError('napi_add_finalizer', 'This API is unavailable')
    })
  }
  return emnapiWrap(WrapType.anonymous, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

emnapiImplement('napi_define_class', napi_define_class, ['$emnapiCreateFunction', '$emnapiDefineProperty'])
emnapiImplement('napi_wrap', napi_wrap, ['$emnapiWrap'])
emnapiImplement('napi_unwrap', napi_unwrap, ['$emnapiUnwrap'])
emnapiImplement('napi_remove_wrap', napi_remove_wrap, ['$emnapiUnwrap'])
emnapiImplement('napi_type_tag_object', napi_type_tag_object)
emnapiImplement('napi_check_object_type_tag', napi_check_object_type_tag)
emnapiImplement('napi_add_finalizer', napi_add_finalizer, ['$emnapiWrap'])
