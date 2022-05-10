function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value >>> 0).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const value = (low >>> 0) + (high * Math.pow(2, 32))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_latin1 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
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
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const utf16String = length === -1 ? UTF16ToString(str) : UTF16ToString(str, length * 2)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(utf16String).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (str === emnapi.NULL)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(utf8String).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportBigInt) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      const value = BigInt(low >>> 0) | (BigInt(high) << BigInt(32))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_uint64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportBigInt) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      const value = BigInt(low >>> 0) | (BigInt(high >>> 0) << BigInt(32))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_words (env: napi_env, sign_bit: int, word_count: size_t, words: Const<Pointer<uint64_t>>, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!emnapi.supportBigInt) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      word_count = word_count >>> 0
      if (word_count > 2147483647) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
        throw new RangeError('Maximum BigInt size exceeded')
      }
      let value: bigint = BigInt(0)
      for (let i = 0; i < word_count; i++) {
        const low = HEAPU32[(words + (i * 8)) >> 2]
        const high = HEAPU32[(words + (i * 8) + 4) >> 2]
        const wordi = BigInt(low) | (BigInt(high) << BigInt(32))
        value += wordi << BigInt(64 * i)
      }
      value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1))
      HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_uint32', napi_create_uint32)
emnapiImplement('napi_create_int64', napi_create_int64)
emnapiImplement('napi_create_double', napi_create_double)
emnapiImplement('napi_create_bigint_int64', napi_create_bigint_int64)
emnapiImplement('napi_create_bigint_uint64', napi_create_bigint_uint64)
emnapiImplement('napi_create_bigint_words', napi_create_bigint_words)
emnapiImplement('napi_create_string_latin1', napi_create_string_latin1)
emnapiImplement('napi_create_string_utf16', napi_create_string_utf16)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
