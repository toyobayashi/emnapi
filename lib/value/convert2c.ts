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

function napi_get_value_bigint_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>, lossless: Pointer<bool>): emnapi.napi_status {
  if (!emnapi.supportBigInt) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result, lossless], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        let numberValue = handle.value
        if (typeof numberValue !== 'bigint') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        if ((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63)))) {
          HEAPU8[lossless] = 1
        } else {
          HEAPU8[lossless] = 0
          numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
          if (numberValue >= (BigInt(1) << BigInt(63))) {
            numberValue = numberValue - (BigInt(1) << BigInt(64))
          }
        }
        const low = Number(numberValue & BigInt(0xffffffff))
        const high = Number(numberValue >> BigInt(32))
        HEAP32[result >> 2] = low
        HEAP32[result + 4 >> 2] = high
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_value_bigint_uint64 (env: napi_env, value: napi_value, result: Pointer<uint64_t>, lossless: Pointer<bool>): emnapi.napi_status {
  if (!emnapi.supportBigInt) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result, lossless], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        let numberValue = handle.value
        if (typeof numberValue !== 'bigint') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
        }
        if ((numberValue >= BigInt(0)) && (numberValue < (BigInt(1) << BigInt(64)))) {
          HEAPU8[lossless] = 1
        } else {
          HEAPU8[lossless] = 0
          numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
        }
        const low = Number(numberValue & BigInt(0xffffffff))
        const high = Number(numberValue >> BigInt(32))
        HEAPU32[result >> 2] = low
        HEAPU32[result + 4 >> 2] = high
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

emnapiImplement('napi_get_value_bool', napi_get_value_bool)
emnapiImplement('napi_get_value_double', napi_get_value_double)
emnapiImplement('napi_get_value_bigint_int64', napi_get_value_bigint_int64)
emnapiImplement('napi_get_value_bigint_uint64', napi_get_value_bigint_uint64)
emnapiImplement('napi_get_value_external', napi_get_value_external)
emnapiImplement('napi_get_value_int32', napi_get_value_int32)
emnapiImplement('napi_get_value_int64', napi_get_value_int64)
emnapiImplement('napi_get_value_string_latin1', napi_get_value_string_latin1)
emnapiImplement('napi_get_value_string_utf8', napi_get_value_string_utf8)
emnapiImplement('napi_get_value_string_utf16', napi_get_value_string_utf16)
emnapiImplement('napi_get_value_uint32', napi_get_value_uint32)
