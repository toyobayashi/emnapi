function napi_get_array_length (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (!handle.isArray()) {
    return envObject.setLastError(napi_status.napi_array_expected)
  }
  $from64('result')
  HEAPU32[result >> 2] = handle.value.length >>> 0
  return envObject.clearLastError()
}

function napi_get_arraybuffer_info (env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Pointer<size_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, arraybuffer)
  const handle = emnapiCtx.handleStore.get(arraybuffer)!
  if (!handle.isArrayBuffer()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  if (data) {
    $from64('data')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const p: number = emnapiExternalMemory.getArrayBufferPointer(handle.value, true).address
    $makeSetValue('data', 0, 'p', '*')
  }
  if (byte_length) {
    $from64('byte_length')
    $makeSetValue('byte_length', 0, 'handle.value.byteLength', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

function napi_get_prototype (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
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
  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const p = envObject.ensureHandleId(Object.getPrototypeOf(v))
  $makeSetValue('result', 0, 'p', '*')
  return envObject.clearLastError()
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
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, typedarray)
  const handle = emnapiCtx.handleStore.get(typedarray)!
  if (!handle.isTypedArray()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v: ArrayBufferView = handle.value
  if (type) {
    $from64('type')
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
    $from64('length')
    $makeSetValue('length', 0, 'v.length', SIZE_TYPE)
  }
  let buffer: ArrayBuffer
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      $from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      $makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      $from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(buffer)
      $makeSetValue('arraybuffer', 0, 'ab', '*')
    }
  }
  if (byte_offset) {
    $from64('byte_offset')
    $makeSetValue('byte_offset', 0, 'v.byteOffset', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

declare const _napi_get_typedarray_info: typeof napi_get_typedarray_info
function napi_get_buffer_info (
  env: napi_env,
  buffer: napi_value,
  data: void_pp,
  length: Pointer<size_t>
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, buffer)
  const handle = emnapiCtx.handleStore.get(buffer)!
  if (!handle.isBuffer()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  return _napi_get_typedarray_info(env, buffer, 0, length, data, 0, 0)
}

function napi_get_dataview_info (
  env: napi_env,
  dataview: napi_value,
  byte_length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, dataview)
  const handle = emnapiCtx.handleStore.get(dataview)!
  if (!handle.isDataView()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v = handle.value as DataView
  if (byte_length) {
    $from64('byte_length')
    $makeSetValue('byte_length', 0, 'v.byteLength', SIZE_TYPE)
  }
  let buffer: ArrayBuffer
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      $from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      $makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      $from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(buffer)
      $makeSetValue('arraybuffer', 0, 'ab', '*')
    }
  }
  if (byte_offset) {
    $from64('byte_offset')
    $makeSetValue('byte_offset', 0, 'v.byteOffset', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

// @ts-expect-error
function napi_get_date_value (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (!handle.isDate()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    $from64('result')
    HEAPF64[result >> 3] = (handle.value as Date).valueOf()
    return envObject.getReturnStatus()
  })
}

function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'boolean') {
    return envObject.setLastError(napi_status.napi_boolean_expected)
  }
  $from64('result')
  HEAPU8[result] = handle.value ? 1 : 0
  return envObject.clearLastError()
}

function napi_get_value_double (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  $from64('result')
  HEAPF64[result >> 3] = handle.value
  return envObject.clearLastError()
}

function napi_get_value_bigint_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>, lossless: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  if (!emnapiCtx.feature.supportBigInt) {
    envObject.tryCatch.setError(emnapiCtx.createNotSupportBigIntError('napi_get_value_bigint_int64', 'This API is unavailable'))
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  const handle = emnapiCtx.handleStore.get(value)!
  let numberValue = handle.value
  if (typeof numberValue !== 'bigint') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  $from64('lossless')
  $from64('result')
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
}

function napi_get_value_bigint_uint64 (env: napi_env, value: napi_value, result: Pointer<uint64_t>, lossless: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  if (!emnapiCtx.feature.supportBigInt) {
    envObject.tryCatch.setError(emnapiCtx.createNotSupportBigIntError('napi_get_value_bigint_uint64', 'This API is unavailable'))
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  const handle = emnapiCtx.handleStore.get(value)!
  let numberValue = handle.value
  if (typeof numberValue !== 'bigint') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  $from64('lossless')
  $from64('result')
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
}

function napi_get_value_bigint_words (
  env: napi_env,
  value: napi_value,
  sign_bit: Pointer<int>,
  word_count: Pointer<size_t>,
  words: Pointer<uint64_t>
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  if (!emnapiCtx.feature.supportBigInt) {
    envObject.tryCatch.setError(emnapiCtx.createNotSupportBigIntError('napi_get_value_bigint_words', 'This API is unavailable'))
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, word_count)
  const handle = emnapiCtx.handleStore.get(value)!
  if (!handle.isBigInt()) {
    return envObject.setLastError(napi_status.napi_bigint_expected)
  }
  const isMinus = handle.value < BigInt(0)

  $from64('sign_bit')
  $from64('words')
  $from64('word_count')

  let word_count_int = $makeGetValue('word_count', 0, SIZE_TYPE) as number
  $from64('word_count_int')

  let wordCount = 0
  let bigintValue: bigint = isMinus ? (handle.value * BigInt(-1)) : handle.value
  while (bigintValue !== BigInt(0)) {
    wordCount++
    bigintValue = bigintValue >> BigInt(64)
  }
  bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value
  if (!sign_bit && !words) {
    word_count_int = wordCount
    $makeSetValue('word_count', 0, 'word_count_int', SIZE_TYPE)
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
    $makeSetValue('word_count', 0, 'len', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

function napi_get_value_external (env: napi_env, value: napi_value, result: void_pp): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (!handle.isExternal()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const p = handle.data(envObject)
  $makeSetValue('result', 0, 'p', '*')
  return envObject.clearLastError()
}

function napi_get_value_int32 (env: napi_env, value: napi_value, result: Pointer<int32_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  $from64('result')
  HEAP32[result >> 2] = handle.value
  return envObject.clearLastError()
}

function napi_get_value_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  const numberValue = handle.value
  $from64('result')
  if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
    HEAP32[result >> 2] = 0
    HEAP32[result + 4 >> 2] = 0
  } else if (numberValue < /* INT64_RANGE_NEGATIVE */ -9223372036854776000) {
    HEAP32[result >> 2] = 0
    HEAP32[result + 4 >> 2] = 0x80000000
  } else if (numberValue >= /* INT64_RANGE_POSITIVE */ 9223372036854776000) {
    HEAPU32[result >> 2] = 0xffffffff
    HEAPU32[result + 4 >> 2] = 0x7fffffff
  } else {
    let tempDouble
    const tempI64 = [numberValue >>> 0, (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)]
    HEAP32[result >> 2] = tempI64[0]
    HEAP32[result + 4 >> 2] = tempI64[1]
  }
  return envObject.clearLastError()
}

function napi_get_value_string_latin1 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $from64('result')
  $from64('buf')
  $from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    $makeSetValue('result', 0, 'handle.value.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    let copied: number = 0
    for (let i = 0; i < buf_size - 1; ++i) {
      HEAPU8[buf + i] = handle.value.charCodeAt(i) & 0xff
      copied++
    }
    HEAPU8[buf + copied] = 0
    if (result) {
      $makeSetValue('result', 0, 'copied', SIZE_TYPE)
    }
  } else if (result) {
    $makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

function napi_get_value_string_utf8 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $from64('result')
  $from64('buf')
  $from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const strLength = lengthBytesUTF8(handle.value)
    $makeSetValue('result', 0, 'strLength', SIZE_TYPE)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = stringToUTF8(handle.value, buf, buf_size)
    if (result) {
      $makeSetValue('result', 0, 'copied', SIZE_TYPE)
    }
  } else if (result) {
    $makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

function napi_get_value_string_utf16 (env: napi_env, value: napi_value, buf: char16_t_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $from64('result')
  $from64('buf')
  $from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    $makeSetValue('result', 0, 'handle.value.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = stringToUTF16(handle.value, buf, buf_size * 2)
    if (result) {
      $makeSetValue('result', 0, 'copied / 2', SIZE_TYPE)
    }
  } else if (result) {
    $makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

function napi_get_value_uint32 (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  $from64('result')
  HEAPU32[result >> 2] = handle.value
  return envObject.clearLastError()
}

emnapiImplement('napi_get_array_length', 'ippp', napi_get_array_length)
emnapiImplement('napi_get_arraybuffer_info', 'ipppp', napi_get_arraybuffer_info, ['$emnapiExternalMemory'])
emnapiImplement('napi_get_prototype', 'ippp', napi_get_prototype)
emnapiImplement('napi_get_typedarray_info', 'ippppppp', napi_get_typedarray_info, ['$emnapiExternalMemory'])
emnapiImplement('napi_get_buffer_info', 'ipppp', napi_get_buffer_info, ['napi_get_typedarray_info'])
emnapiImplement('napi_get_dataview_info', 'ipppppp', napi_get_dataview_info, ['$emnapiExternalMemory'])
emnapiImplement('napi_get_date_value', 'ippp', napi_get_date_value)
emnapiImplement('napi_get_value_bool', 'ippp', napi_get_value_bool)
emnapiImplement('napi_get_value_double', 'ippp', napi_get_value_double)
emnapiImplement('napi_get_value_bigint_int64', 'ipppp', napi_get_value_bigint_int64)
emnapiImplement('napi_get_value_bigint_uint64', 'ipppp', napi_get_value_bigint_uint64)
emnapiImplement('napi_get_value_bigint_words', 'ippppp', napi_get_value_bigint_words)
emnapiImplement('napi_get_value_external', 'ippp', napi_get_value_external)
emnapiImplement('napi_get_value_int32', 'ippp', napi_get_value_int32)
emnapiImplement('napi_get_value_int64', 'ippp', napi_get_value_int64)
emnapiImplement('napi_get_value_string_latin1', 'ippppp', napi_get_value_string_latin1)
emnapiImplement('napi_get_value_string_utf8', 'ippppp', napi_get_value_string_utf8)

// #if typeof LEGACY_RUNTIME !== 'undefined' && !LEGACY_RUNTIME
emnapiImplement('napi_get_value_string_utf16', 'ippppp', napi_get_value_string_utf16, ['$stringToUTF16'])
// #else
emnapiImplement('napi_get_value_string_utf16', 'ippppp', napi_get_value_string_utf16)
// #endif

emnapiImplement('napi_get_value_uint32', 'ippp', napi_get_value_uint32)
