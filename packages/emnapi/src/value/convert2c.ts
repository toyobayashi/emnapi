function napi_get_array_length (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (!handle.isArray()) {
        return envObject.setLastError(napi_status.napi_array_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU32[result >> 2] = handle.value.length >>> 0
      return envObject.clearLastError()
    })
  })
}

function napi_get_arraybuffer_info (env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Pointer<size_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [arraybuffer], () => {
      const handle = emnapi.handleStore.get(arraybuffer)!
      if (!handle.isArrayBuffer()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (data) {
        // #if MEMORY64
        data = Number(data)
        // #endif

        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const p = getArrayBufferPointer(handle.value)
        makeSetValue('data', 0, 'p', '*')
      }
      if (byte_length) {
        // #if MEMORY64
        HEAPU64[Number(byte_length) >> 3] = BigInt((handle.value as ArrayBuffer).byteLength)
        // #else
        HEAPU32[byte_length >> 2] = (handle.value as ArrayBuffer).byteLength
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_prototype (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (handle.value == null) {
        envObject.tryCatch.setError(new TypeError('Cannot convert undefined or null to object'))
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      let v: any
      try {
        v = handle.isObject() || handle.isFunction() ? handle.value : Object(handle.value)
      } catch (_) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p = envObject.ensureHandleId(Object.getPrototypeOf(v))
      makeSetValue('result', 0, 'p', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_typedarray_info (
  env: napi_env,
  typedarray: napi_value,
  type: Pointer<napi_typedarray_type>,
  length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [typedarray], () => {
      const handle = emnapi.handleStore.get(typedarray)!
      if (!handle.isTypedArray()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v = handle.value
      if (type) {
        // #if MEMORY64
        type = Number(type)
        // #endif
        if (v instanceof Int8Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_int8_array
        } else if (v instanceof Uint8Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_uint8_array
        } else if (v instanceof Uint8ClampedArray) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_uint8_clamped_array
        } else if (v instanceof Int16Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_int16_array
        } else if (v instanceof Uint16Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_uint16_array
        } else if (v instanceof Int32Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_int32_array
        } else if (v instanceof Uint32Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_uint32_array
        } else if (v instanceof Float32Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_float32_array
        } else if (v instanceof Float64Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_float64_array
        } else if (v instanceof BigInt64Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_bigint64_array
        } else if (v instanceof BigUint64Array) {
          HEAP32[type >> 2] = napi_typedarray_type.napi_biguint64_array
        }
      }
      if (length) {
        // #if MEMORY64
        HEAPU64[Number(length) >> 3] = BigInt(v.length)
        // #else
        HEAPU32[length >> 2] = v.length
        // #endif
      }
      let buffer: ArrayBuffer
      if (data || arraybuffer) {
        buffer = v.buffer
        if (data) {
          // #if MEMORY64
          data = Number(data)
          // #endif

          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const p = getViewPointer(v)
          makeSetValue('data', 0, 'p', '*')
        }
        if (arraybuffer) {
          // #if MEMORY64
          arraybuffer = Number(arraybuffer)
          // #endif

          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const ab = envObject.ensureHandleId(buffer)
          makeSetValue('arraybuffer', 0, 'ab', '*')
        }
      }
      if (byte_offset) {
        // #if MEMORY64
        HEAPU64[Number(byte_offset) >> 3] = BigInt(v.byteOffset)
        // #else
        HEAPU32[byte_offset >> 2] = v.byteOffset
        // #endif
      }
      return envObject.clearLastError()
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
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [dataview], () => {
      const handle = emnapi.handleStore.get(dataview)!
      if (!handle.isDataView()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v = handle.value as DataView
      if (byte_length) {
        // #if MEMORY64
        HEAPU64[Number(byte_length) >> 3] = BigInt(v.byteLength)
        // #else
        HEAPU32[byte_length >> 2] = v.byteLength
        // #endif
      }
      let buffer: ArrayBuffer
      if (data || arraybuffer) {
        buffer = v.buffer
        if (data) {
          // #if MEMORY64
          data = Number(data)
          // #endif

          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const p = getViewPointer(v)
          makeSetValue('data', 0, 'p', '*')
        }
        if (arraybuffer) {
          // #if MEMORY64
          arraybuffer = Number(arraybuffer)
          // #endif

          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const ab = envObject.ensureHandleId(buffer)
          makeSetValue('arraybuffer', 0, 'ab', '*')
        }
      }
      if (byte_offset) {
        // #if MEMORY64
        HEAPU64[Number(byte_offset) >> 3] = BigInt(v.byteOffset)
        // #else
        HEAPU32[byte_offset >> 2] = v.byteOffset
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_date_value (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (!handle.isDate()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPF64[result >> 3] = (handle.value as Date).valueOf()
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'boolean') {
        return envObject.setLastError(napi_status.napi_boolean_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU8[result] = handle.value ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_double (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPF64[result >> 3] = handle.value
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>, lossless: Pointer<bool>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportBigInt) {
      envObject.tryCatch.setError(new emnapi.NotSupportBigIntError('napi_get_value_bigint_int64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return emnapi.checkArgs(envObject, [value, result, lossless], () => {
      const handle = emnapi.handleStore.get(value)!
      let numberValue = handle.value
      if (typeof numberValue !== 'bigint') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      // #if MEMORY64
      lossless = Number(lossless)
      result = Number(result)
      // #endif
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
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_uint64 (env: napi_env, value: napi_value, result: Pointer<uint64_t>, lossless: Pointer<bool>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportBigInt) {
      envObject.tryCatch.setError(new emnapi.NotSupportBigIntError('napi_get_value_bigint_uint64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return emnapi.checkArgs(envObject, [value, result, lossless], () => {
      const handle = emnapi.handleStore.get(value)!
      let numberValue = handle.value
      if (typeof numberValue !== 'bigint') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      // #if MEMORY64
      lossless = Number(lossless)
      result = Number(result)
      // #endif
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
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_bigint_words (
  env: napi_env,
  value: napi_value,
  sign_bit: Pointer<int>,
  word_count: Pointer<size_t>,
  words: Pointer<uint64_t>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportBigInt) {
      envObject.tryCatch.setError(new emnapi.NotSupportBigIntError('napi_get_value_bigint_words', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    return emnapi.checkArgs(envObject, [value, word_count], () => {
      const handle = emnapi.handleStore.get(value)!
      if (!handle.isBigInt()) {
        return envObject.setLastError(napi_status.napi_bigint_expected)
      }
      const isMinus = handle.value < BigInt(0)
      let word_count_int: number
      // #if MEMORY64
      sign_bit = Number(sign_bit)
      words = Number(words)
      word_count = Number(word_count)
      word_count_int = Number(HEAPU64[word_count >> 3])
      // #else
      word_count_int = HEAPU32[word_count >> 2]
      // #endif

      let wordCount = 0
      let bigintValue: bigint = isMinus ? (handle.value * BigInt(-1)) : handle.value
      while (bigintValue !== BigInt(0)) {
        wordCount++
        bigintValue = bigintValue >> BigInt(64)
      }
      bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value
      if (!sign_bit && !words) {
        word_count_int = wordCount
        // #if MEMORY64
        HEAPU64[word_count >> 3] = BigInt(word_count_int)
        // #else
        HEAPU32[word_count >> 2] = word_count_int
        // #endif
      } else {
        if (!sign_bit) return envObject.setLastError(napi_status.napi_invalid_arg)
        if (!words) return envObject.setLastError(napi_status.napi_invalid_arg)
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
        // #if MEMORY64
        HEAPU64[word_count >> 3] = BigInt(len)
        // #else
        HEAPU32[word_count >> 2] = len
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_external (env: napi_env, value: napi_value, result: void_pp): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (!handle.isExternal()) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p = (handle as emnapi.ExternalHandle).data()
      makeSetValue('result', 0, 'p', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_int32 (env: napi_env, value: napi_value, result: Pointer<int32_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAP32[result >> 2] = handle.value
      return envObject.clearLastError()
    })
  })
}

declare const INT64_RANGE_POSITIVE: number
declare const INT64_RANGE_NEGATIVE: number
function napi_get_value_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      const numberValue = handle.value
      // #if MEMORY64
      result = Number(result)
      // #endif
      if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
        HEAP32[result >> 2] = 0
        HEAP32[result + 4 >> 2] = 0
      } else if (numberValue < INT64_RANGE_NEGATIVE) {
        HEAP32[result >> 2] = 0
        HEAP32[result + 4 >> 2] = 0x80000000
      } else if (numberValue >= INT64_RANGE_POSITIVE) {
        HEAPU32[result >> 2] = 0xffffffff
        HEAPU32[result + 4 >> 2] = 0x7fffffff
      } else {
        let tempDouble
        const tempI64 = [numberValue >>> 0, (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)]
        HEAP32[result >> 2] = tempI64[0]
        HEAP32[result + 4 >> 2] = tempI64[1]
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_latin1 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value], () => {
      // #if MEMORY64
      result = Number(result)
      buf = Number(buf)
      buf_size = Number(buf_size) >>> 0
      // #else
      buf_size = buf_size >>> 0
      // #endif
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(handle.value.length)
        // #else
        HEAPU32[result >> 2] = handle.value.length
        // #endif
      } else if (buf_size !== 0) {
        let copied: number = 0
        for (let i = 0; i < buf_size - 1; ++i) {
          HEAPU8[buf + i] = handle.value.charCodeAt(i) & 0xff
          copied++
        }
        HEAPU8[buf + copied] = 0
        if (result) {
          // #if MEMORY64
          HEAPU64[result >> 3] = BigInt(copied)
          // #else
          HEAPU32[result >> 2] = copied
          // #endif
        }
      } else if (result) {
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(0)
        // #else
        HEAPU32[result >> 2] = 0
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_utf8 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value], () => {
      // #if MEMORY64
      buf = Number(buf)
      result = Number(result)
      buf_size = Number(buf_size) >>> 0
      // #else
      buf_size = buf_size >>> 0
      // #endif
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(lengthBytesUTF8(handle.value))
        // #else
        HEAPU32[result >> 2] = lengthBytesUTF8(handle.value)
        // #endif
      } else if (buf_size !== 0) {
        const copied = stringToUTF8(handle.value, buf, buf_size)
        if (result) {
          // #if MEMORY64
          HEAPU64[result >> 3] = BigInt(copied)
          // #else
          HEAPU32[result >> 2] = copied
          // #endif
        }
      } else if (result) {
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(0)
        // #else
        HEAPU32[result >> 2] = 0
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_string_utf16 (env: napi_env, value: napi_value, buf: char16_t_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value], () => {
      // #if MEMORY64
      buf = Number(buf)
      result = Number(result)
      buf_size = Number(buf_size) >>> 0
      // #else
      buf_size = buf_size >>> 0
      // #endif
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      if (!buf) {
        if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(handle.value.length)
        // #else
        HEAPU32[result >> 2] = handle.value.length
        // #endif
      } else if (buf_size !== 0) {
        const copied = stringToUTF16(handle.value, buf, buf_size * 2)
        if (result) {
          // #if MEMORY64
          HEAPU64[result >> 3] = BigInt(copied / 2)
          // #else
          HEAPU32[result >> 2] = copied / 2
          // #endif
        }
      } else if (result) {
        // #if MEMORY64
        HEAPU64[result >> 3] = BigInt(0)
        // #else
        HEAPU32[result >> 2] = 0
        // #endif
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_value_uint32 (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (typeof handle.value !== 'number') {
        return envObject.setLastError(napi_status.napi_number_expected)
      }
      // #if MEMORY64
      result = Number(result)
      // #endif
      HEAPU32[result >> 2] = handle.value
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_get_array_length', napi_get_array_length)
emnapiImplement('napi_get_arraybuffer_info', napi_get_arraybuffer_info, ['$getArrayBufferPointer'])
emnapiImplement('napi_get_prototype', napi_get_prototype)
emnapiImplement('napi_get_typedarray_info', napi_get_typedarray_info, ['$getViewPointer'])
emnapiImplement('napi_get_dataview_info', napi_get_dataview_info, ['$getViewPointer'])
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

// #if typeof LEGACY_RUNTIME !== 'undefined' && !LEGACY_RUNTIME
emnapiImplement('napi_get_value_string_utf16', napi_get_value_string_utf16, ['$stringToUTF16'])
// #else
emnapiImplement('napi_get_value_string_utf16', napi_get_value_string_utf16)
// #endif

emnapiImplement('napi_get_value_uint32', napi_get_value_uint32)
