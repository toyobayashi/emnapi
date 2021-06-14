function napi_get_array_length (env: napi_env, value: napi_value, result: Pointer<uint32_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (!handle.isArray()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_array_expected)
        }
        HEAPU32[result >> 2] = handle.value.length >>> 0
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_arraybuffer_info (env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Pointer<size_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [arraybuffer], () => {
      try {
        const handle = envObject.handleStore.get(arraybuffer)!
        if (!handle.isArrayBuffer()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
        if (data !== emnapi.NULL) {
          HEAP32[data >> 2] = 0
        }
        if (byte_length !== emnapi.NULL) {
          HEAPU32[byte_length >> 2] = (handle.value as ArrayBuffer).byteLength
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_prototype (env: napi_env, value: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (!handle.isObject()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
        }
        HEAP32[result >> 2] = envObject.ensureHandleId(Object.getPrototypeOf(handle.value))
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_typedarray_info (
  env: napi_env,
  typedarray: napi_value,
  type: Pointer<emnapi.napi_typedarray_type>,
  length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [typedarray], () => {
      try {
        const handle = envObject.handleStore.get(typedarray)!
        if (!handle.isTypedArray()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
        const v = handle.value
        if (type !== emnapi.NULL) {
          if (v instanceof Int8Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_int8_array
          } else if (v instanceof Uint8Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_uint8_array
          } else if (v instanceof Uint8ClampedArray) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_uint8_clamped_array
          } else if (v instanceof Int16Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_int16_array
          } else if (v instanceof Uint16Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_uint16_array
          } else if (v instanceof Int32Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_int32_array
          } else if (v instanceof Uint32Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_uint32_array
          } else if (v instanceof Float32Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_float32_array
          } else if (v instanceof Float64Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_float64_array
          } else if (v instanceof BigInt64Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_bigint64_array
          } else if (v instanceof BigUint64Array) {
            HEAP32[type >> 2] = emnapi.napi_typedarray_type.napi_biguint64_array
          }
        }
        if (length !== emnapi.NULL) {
          HEAPU32[length >> 2] = v.length
        }
        let buffer: ArrayBuffer
        if (data !== emnapi.NULL || arraybuffer !== emnapi.NULL) {
          buffer = v.buffer
          if (data !== emnapi.NULL) {
            HEAP32[data >> 2] = 0
          }
          if (arraybuffer !== emnapi.NULL) {
            HEAP32[arraybuffer >> 2] = envObject.ensureHandleId(buffer)
          }
        }
        if (byte_offset !== emnapi.NULL) {
          HEAPU32[byte_offset >> 2] = v.byteOffset
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_dataview_info (
  env: napi_env,
  dataview: napi_value,
  byte_length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [dataview], () => {
      try {
        const handle = envObject.handleStore.get(dataview)!
        if (!handle.isDataView()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
        const v = handle.value as DataView
        if (byte_length !== emnapi.NULL) {
          HEAPU32[byte_length >> 2] = v.byteLength
        }
        let buffer: ArrayBuffer
        if (data !== emnapi.NULL || arraybuffer !== emnapi.NULL) {
          buffer = v.buffer
          if (data !== emnapi.NULL) {
            HEAP32[data >> 2] = 0
          }
          if (arraybuffer !== emnapi.NULL) {
            HEAP32[arraybuffer >> 2] = envObject.ensureHandleId(buffer)
          }
        }
        if (byte_offset !== emnapi.NULL) {
          HEAPU32[byte_offset >> 2] = v.byteOffset
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_date_value (env: napi_env, value: napi_value, result: Pointer<double>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      const handle = envObject.handleStore.get(value)!
      if (!handle.isDate()) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      HEAPF64[result >> 3] = (handle.value as Date).valueOf()
      return emnapi.getReturnStatus(env)
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

function napi_get_value_bigint_words (
  env: napi_env,
  value: napi_value,
  sign_bit: Pointer<int>,
  word_count: Pointer<size_t>,
  words: Pointer<uint64_t>
): emnapi.napi_status {
  if (!emnapi.supportBigInt) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, word_count], () => {
      try {
        const handle = envObject.handleStore.get(value)!
        if (!handle.isBigInt()) {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_bigint_expected)
        }
        const isMinus = handle.value < BigInt(0)
        let word_count_int = HEAP32[word_count >> 2]
        let wordCount = 0
        let bigintValue: bigint = isMinus ? (handle.value * BigInt(-1)) : handle.value
        while (bigintValue !== BigInt(0)) {
          wordCount++
          bigintValue = bigintValue >> BigInt(64)
        }
        bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value
        word_count_int = wordCount
        if (sign_bit === emnapi.NULL && words === emnapi.NULL) {
          HEAPU32[word_count >> 2] = word_count_int
        } else {
          if (sign_bit === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          if (words === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          const wordsArr = []
          while (bigintValue !== BigInt(0)) {
            const uint64 = bigintValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
            wordsArr.push(uint64)
            bigintValue = bigintValue >> BigInt(64)
          }
          const len = Math.min(word_count_int, wordsArr.length)
          for (let i = 0; i < len; i++) {
            const low = Number(wordsArr[i] & BigInt(0xffffffff))
            const high = Number(wordsArr[i] >> BigInt(32))
            HEAPU32[(words + (i * 8)) >> 2] = low
            HEAPU32[(words + 4 + (i * 8)) >> 2] = high
          }
          HEAP32[sign_bit >> 2] = isMinus ? 1 : 0
          HEAPU32[word_count >> 2] = len
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

emnapiImplement('napi_get_array_length', napi_get_array_length)
emnapiImplement('napi_get_arraybuffer_info', napi_get_arraybuffer_info)
emnapiImplement('napi_get_prototype', napi_get_prototype)
emnapiImplement('napi_get_typedarray_info', napi_get_typedarray_info)
emnapiImplement('napi_get_dataview_info', napi_get_dataview_info)
emnapiImplement('napi_get_date_value', napi_get_date_value)
emnapiImplement('napi_get_value_bool', napi_get_value_bool)
emnapiImplement('napi_get_value_double', napi_get_value_double)
emnapiImplement('napi_get_value_bigint_int64', napi_get_value_bigint_int64)
emnapiImplement('napi_get_value_bigint_uint64', napi_get_value_bigint_uint64)
emnapiImplement('napi_get_value_bigint_words', napi_get_value_bigint_words)
emnapiImplement('napi_get_value_external', napi_get_value_external)
emnapiImplement('napi_get_value_int32', napi_get_value_int32)
emnapiImplement('napi_get_value_int64', napi_get_value_int64)
emnapiImplement('napi_get_value_string_latin1', napi_get_value_string_latin1)
emnapiImplement('napi_get_value_string_utf8', napi_get_value_string_utf8)
emnapiImplement('napi_get_value_string_utf16', napi_get_value_string_utf16)
emnapiImplement('napi_get_value_uint32', napi_get_value_uint32)
