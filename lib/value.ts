function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const value = (low >>> 0) + (high * Math.pow(2, 32))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value >>> 0).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(utf8String).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_string_latin1 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }

      let latin1String = ''
      let len = 0
      if (length === -1) {
        while (true) {
          const ch = HEAPU8[str]
          if (!ch) break
          latin1String += String.fromCharCode(ch)
          str++
        }
      } else {
        while (len < length) {
          const ch = HEAPU8[str]
          if (!ch) break
          latin1String += String.fromCharCode(ch)
          len++
          str++
        }
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(latin1String).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_string_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }

      const utf16String = length === -1 ? UTF16ToString(str) : UTF16ToString(str, length * 2)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(utf16String).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add({}).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_array (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add([]).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_array_with_length (env: napi_env, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new Array(length >>> 0)).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_symbol (env: napi_env, description: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      if (description === emnapi.NULL) {
        // eslint-disable-next-line symbol-description
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol()).id
      } else {
        const handle = envObject.handleStore.get(description)!
        const desc = handle.value
        if (typeof desc !== 'string') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
        }
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol(desc)).id
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const externalHandle = emnapi.ExternalHandle.createExternal(env, data)
      envObject.getCurrentScope().addNoCopy(externalHandle)
      emnapi.Reference.create(env, externalHandle.id, 0, true, finalize_cb, data, finalize_hint)
      HEAP32[result >> 2] = externalHandle.id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_UNDEFINED
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_NULL
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      if (value === 0) {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_FALSE
      } else {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_TRUE
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = emnapi.HandleStore.ID_GLOBAL
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'boolean') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_boolean_expected)
        }
        HEAPU8[result] = handle.value ? 1 : 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_int32 (env: napi_env, value: napi_value, result: Pointer<int32_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'number') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        HEAP32[result >> 2] = handle.value
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_uint32 (env: napi_env, value: napi_value, result: Pointer<uint32_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'number') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        HEAPU32[result >> 2] = handle.value
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'number') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        const numberValue = handle.value
        if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
          HEAP32[result >> 2] = 0
          HEAP32[result + 4 >> 2] = 0
        } else if (numberValue < emnapi.INT64_RANGE_NEGATIVE) {
          HEAP32[result >> 2] = 0
          HEAP32[result + 4 >> 2] = 0x80000000
        } else if (numberValue >= emnapi.INT64_RANGE_POSITIVE) {
          HEAPU32[result >> 2] = 0xffffffff
          HEAPU32[result + 4 >> 2] = 0x7fffffff
        } else {
          let tempDouble
          const tempI64 = [numberValue >>> 0, (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)]
          HEAP32[result >> 2] = tempI64[0]
          HEAP32[result + 4 >> 2] = tempI64[1]
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_double (env: napi_env, value: napi_value, result: Pointer<double>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'number') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        HEAPF64[result >> 3] = handle.value
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_string_latin1 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value], () => {
      buf_size = buf_size >>> 0
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'string') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
        }
        if (buf === emnapi.NULL) {
          if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          HEAPU32[result >> 2] = handle.value.length
        } else if (buf_size !== 0) {
          let copied: number = 0
          for (let i = 0; i < buf_size - 1; ++i) {
            HEAPU8[buf + i] = handle.value.charCodeAt(i) & 0xff
            copied++
          }
          HEAPU8[buf + copied] = 0
          if (result !== emnapi.NULL) {
            HEAPU32[result >> 2] = copied
          }
        } else if (result !== emnapi.NULL) {
          HEAPU32[result >> 2] = 0
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_string_utf8 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value], () => {
      buf_size = buf_size >>> 0
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'string') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
        }
        if (buf === emnapi.NULL) {
          if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          const stackPtrSize = handle.value.length * 3
          const stackPtr = stackAlloc(stackPtrSize)
          const copied = stringToUTF8(handle.value, stackPtr, stackPtrSize)
          HEAPU32[result >> 2] = copied
        } else if (buf_size !== 0) {
          const copied = stringToUTF8(handle.value, buf, buf_size)
          if (result !== emnapi.NULL) {
            HEAPU32[result >> 2] = copied
          }
        } else if (result !== emnapi.NULL) {
          HEAPU32[result >> 2] = 0
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_string_utf16 (env: napi_env, value: napi_value, buf: char16_t_p, buf_size: size_t, result: Pointer<size_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value], () => {
      buf_size = buf_size >>> 0
      try {
        const handle = envObject.handleStore.get(value)!
        if (typeof handle.value !== 'string') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
        }
        if (buf === emnapi.NULL) {
          if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          HEAPU32[result >> 2] = handle.value.length
        } else if (buf_size !== 0) {
          const copied = stringToUTF16(handle.value, buf, buf_size * 2)
          if (result !== emnapi.NULL) {
            HEAPU32[result >> 2] = copied / 2
          }
        } else if (result !== emnapi.NULL) {
          HEAPU32[result >> 2] = 0
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_external (env: napi_env, value: napi_value, result: void_pp): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (!handle.isExternal()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
        HEAP32[result >> 2] = (handle as emnapi.ExternalHandle).data()
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_int64', napi_create_int64)
emnapiImplement('napi_create_uint32', napi_create_uint32)
emnapiImplement('napi_create_double', napi_create_double)
emnapiImplement('napi_create_string_latin1', napi_create_string_latin1)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
emnapiImplement('napi_create_string_utf16', napi_create_string_utf16)
emnapiImplement('napi_create_object', napi_create_object)
emnapiImplement('napi_create_array', napi_create_array)
emnapiImplement('napi_create_array_with_length', napi_create_array_with_length)
emnapiImplement('napi_create_symbol', napi_create_symbol)
emnapiImplement('napi_create_external', napi_create_external)
emnapiImplement('napi_get_undefined', napi_get_undefined)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_boolean', napi_get_boolean)
emnapiImplement('napi_get_global', napi_get_global)

emnapiImplement('napi_get_value_bool', napi_get_value_bool)
emnapiImplement('napi_get_value_int32', napi_get_value_int32)
emnapiImplement('napi_get_value_int64', napi_get_value_int64)
emnapiImplement('napi_get_value_uint32', napi_get_value_uint32)
emnapiImplement('napi_get_value_double', napi_get_value_double)
emnapiImplement('napi_get_value_string_latin1', napi_get_value_string_latin1)
emnapiImplement('napi_get_value_string_utf8', napi_get_value_string_utf8)
emnapiImplement('napi_get_value_string_utf16', napi_get_value_string_utf16)
emnapiImplement('napi_get_value_external', napi_get_value_external)
