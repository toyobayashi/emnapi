function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
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

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const value = (low >>> 0) + (high * Math.pow(2, 32))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
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

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_uint32', napi_create_uint32)
emnapiImplement('napi_create_int64', napi_create_int64)
emnapiImplement('napi_create_double', napi_create_double)
emnapiImplement('napi_create_string_latin1', napi_create_string_latin1)
emnapiImplement('napi_create_string_utf16', napi_create_string_utf16)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
