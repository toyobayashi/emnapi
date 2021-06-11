function napi_typeof (env: napi_env, value: napi_value, result: Pointer<emnapi.napi_valuetype>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const v = envObject.handleStore.get(value)!
        if (v.isNumber()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_number
        } else if (v.isBigInt()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_bigint
        } else if (v.isString()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_string
        } else if (v.isFunction()) {
        // This test has to come before IsObject because IsFunction
        // implies IsObject
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_function
        } else if (v.isExternal()) {
        // This test has to come before IsObject because IsExternal
        // implies IsObject
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_external
        } else if (v.isObject()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_object
        } else if (v.isBoolean()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_boolean
        } else if (v.isUndefined()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_undefined
        } else if (v.isSymbol()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_symbol
        } else if (v.isNull()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_null
        } else {
        // Should not get here unless V8 has added some new kind of value.
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }

      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_coerce_to_bool (env: napi_env, value: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      const handle = envObject.handleStore.get(value)!
      HEAP32[result >> 2] = handle.value ? emnapi.HandleStore.ID_TRUE : emnapi.HandleStore.ID_FALSE
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_coerce_to_number (env: napi_env, value: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      const handle = envObject.handleStore.get(value)!
      if (handle.isBigInt()) {
        envObject.tryCatch.setError(new TypeError('Cannot convert a BigInt value to a number'))
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.ensureHandleId(Number(handle.value))
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_coerce_to_object (env: napi_env, value: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      const handle = envObject.handleStore.get(value)!
      HEAP32[result >> 2] = envObject.ensureHandleId(Object(handle.value))
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_coerce_to_string (env: napi_env, value: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      const handle = envObject.handleStore.get(value)!
      if (handle.isSymbol()) {
        envObject.tryCatch.setError(new TypeError('Cannot convert a Symbol value to a string'))
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(String(handle.value)).id
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_instanceof (env: napi_env, object: napi_value, constructor: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [object, result, constructor], () => {
      HEAPU8[result] = 0
      const ctor = envObject.handleStore.get(constructor)!
      if (!ctor.isFunction()) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_function_expected)
      }
      const val = envObject.handleStore.get(object)!.value
      const ret = val instanceof ctor.value
      HEAPU8[result] = ret ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_is_array (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const h = envObject.handleStore.get(value)!
        HEAPU8[result] = h.isArray() ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_is_arraybuffer (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const h = envObject.handleStore.get(value)!
        HEAPU8[result] = h.isArrayBuffer() ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_is_date (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const h = envObject.handleStore.get(value)!
        HEAPU8[result] = h.isDate() ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_is_error (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const val = envObject.handleStore.get(value)!.value
        HEAPU8[result] = val instanceof Error ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_is_typedarray (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const h = envObject.handleStore.get(value)!
        HEAPU8[result] = h.isTypedArray() ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_is_dataview (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const h = envObject.handleStore.get(value)!
        HEAPU8[result] = h.isDataView() ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_strict_equals (env: napi_env, lhs: napi_value, rhs: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [lhs, rhs, result], () => {
      const lv = envObject.handleStore.get(lhs)!.value
      const rv = envObject.handleStore.get(rhs)!.value
      HEAPU8[result] = (lv === rv) ? 1 : 0
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_detach_arraybuffer (env: napi_env, _arraybuffer: napi_value): emnapi.napi_status {
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

function napi_is_detached_arraybuffer (env: napi_env, _arraybuffer: napi_value, _result: Pointer<bool>): emnapi.napi_status {
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

emnapiImplement('napi_typeof', napi_typeof)
emnapiImplement('napi_coerce_to_bool', napi_coerce_to_bool)
emnapiImplement('napi_coerce_to_number', napi_coerce_to_number)
emnapiImplement('napi_coerce_to_object', napi_coerce_to_object)
emnapiImplement('napi_coerce_to_string', napi_coerce_to_string)
emnapiImplement('napi_instanceof', napi_instanceof)
emnapiImplement('napi_is_array', napi_is_array)
emnapiImplement('napi_is_arraybuffer', napi_is_arraybuffer)
emnapiImplement('napi_is_date', napi_is_date)
emnapiImplement('napi_is_error', napi_is_error)
emnapiImplement('napi_is_typedarray', napi_is_typedarray)
emnapiImplement('napi_is_dataview', napi_is_dataview)
emnapiImplement('napi_strict_equals', napi_strict_equals)
emnapiImplement('napi_detach_arraybuffer', napi_detach_arraybuffer)
emnapiImplement('napi_is_detached_arraybuffer', napi_is_detached_arraybuffer)
