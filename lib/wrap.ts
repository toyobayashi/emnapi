function napi_define_class (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>,
  result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, constructor], () => {
      property_count = property_count >>> 0
      length = length >>> 0
      if (property_count > 0) {
        if (properties === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (utf8name === emnapi.NULL)) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const F = emnapi.createFunction(env, utf8name, length, constructor, callback_data)

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

        if ((attributes & emnapi.napi_property_attributes.napi_static) !== 0) {
          emnapi.defineProperty(env, F, propertyName, method, getter, setter, value, attributes, data)
          continue
        }
        emnapi.defineProperty(env, F.prototype, propertyName, method, getter, setter, value, attributes, data)
      }

      const valueHandle = envObject.getCurrentScope().add(F)
      HEAP32[result >> 2] = valueHandle.id
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.wrap(emnapi.WrapType.retrievable, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

function napi_unwrap (env: napi_env, js_object: napi_value, result: void_pp): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.unwrap(env, js_object, result, emnapi.UnwrapAction.KeepWrap)
}

function napi_remove_wrap (env: napi_env, js_object: napi_value, result: void_pp): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.unwrap(env, js_object, result, emnapi.UnwrapAction.RemoveWrap)
}

function napi_type_tag_object (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
    }
    const value = envObject.handleStore.get(object)!
    if (!value.isObject()) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_object_expected)
    }
    if (type_tag === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
    }
    if (value.tag !== null) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
    }
    value.tag = [
      HEAPU32[type_tag >> 2],
      HEAPU32[(type_tag + 4) >> 2],
      HEAPU32[(type_tag + 8) >> 2],
      HEAPU32[(type_tag + 12) >> 2]
    ]

    return emnapi.getReturnStatus(env)
  })
}

function napi_check_object_type_tag (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (object === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
    }
    const value = envObject.handleStore.get(object)!
    if (!value.isObject()) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_object_expected)
    }
    if (type_tag === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
    }
    if (result === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, envObject.tryCatch.hasCaught() ? emnapi.napi_status.napi_pending_exception : emnapi.napi_status.napi_invalid_arg)
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

    return emnapi.getReturnStatus(env)
  })
}

function napi_add_finalizer (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.wrap(emnapi.WrapType.anonymous, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

emnapiImplement('napi_define_class', napi_define_class)
emnapiImplement('napi_wrap', napi_wrap)
emnapiImplement('napi_unwrap', napi_unwrap)
emnapiImplement('napi_remove_wrap', napi_remove_wrap)
emnapiImplement('napi_type_tag_object', napi_type_tag_object)
emnapiImplement('napi_check_object_type_tag', napi_check_object_type_tag)
emnapiImplement('napi_add_finalizer', napi_add_finalizer)
