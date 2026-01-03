import { emnapiCtx } from 'emnapi:shared'
import { SIZE_TYPE, from64, makeGetValue, makeSetValue } from 'emscripten:parse-tools'
import { $emnapiSetValueI64 as emnapiSetValueI64 } from '../util'
import { emnapiString } from '../string'
import { emnapiExternalMemory } from '../memory'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $PREAMBLE, $RETURN_STATUS_IF_FALSE } from '../macro'

/**
 * @__sig ippp
 */
export function napi_get_array_length (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (!handle.isArray()) {
      return envObject.setLastError(napi_status.napi_array_expected)
    }
    from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = handle.value.length >>> 0
    makeSetValue('result', 0, 'v', 'u32')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ipppp
 */
export function napi_get_arraybuffer_info (env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Pointer<size_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, arraybuffer)
  const handle = emnapiCtx.handleStore.get(arraybuffer)!
  if (!handle.isArrayBuffer() && !emnapiExternalMemory.isSharedArrayBuffer(handle.value)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  if (data) {
    from64('data')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const p: number = emnapiExternalMemory.getArrayBufferPointer(handle.value, true).address
    makeSetValue('data', 0, 'p', '*')
  }
  if (byte_length) {
    from64('byte_length')
    makeSetValue('byte_length', 0, 'handle.value.byteLength', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function node_api_set_prototype (env: napi_env, object: napi_value, value: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    const obj = emnapiCtx.handleStore.get(object)!
    if (obj == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    const type = typeof obj
    let v: any
    try {
      v = (type === 'object' && obj !== null) || type === 'function' ? obj : Object(obj)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    const val = emnapiCtx.handleStore.get(value)!
    Object.setPrototypeOf(v, val)

    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ippp
 */
export function napi_get_prototype (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (handle.value == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    let v: any
    try {
      v = handle.isObject() || handle.isFunction() ? handle.value : Object(handle.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const p = envObject.ensureHandleId(Object.getPrototypeOf(v))
    makeSetValue('result', 0, 'p', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ippppppp
 */
export function napi_get_typedarray_info (
  env: napi_env,
  typedarray: napi_value,
  type: Pointer<napi_typedarray_type>,
  length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, typedarray)
  const handle = emnapiCtx.handleStore.get(typedarray)!
  if (!handle.isTypedArray()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v: ArrayBufferView = handle.value
  if (type) {
    from64('type')
    let t: napi_typedarray_type
    if (v instanceof Int8Array) {
      t = napi_typedarray_type.napi_int8_array
    } else if (v instanceof Uint8Array) {
      t = napi_typedarray_type.napi_uint8_array
    } else if (v instanceof Uint8ClampedArray) {
      t = napi_typedarray_type.napi_uint8_clamped_array
    } else if (v instanceof Int16Array) {
      t = napi_typedarray_type.napi_int16_array
    } else if (v instanceof Uint16Array) {
      t = napi_typedarray_type.napi_uint16_array
    } else if (v instanceof Int32Array) {
      t = napi_typedarray_type.napi_int32_array
    } else if (v instanceof Uint32Array) {
      t = napi_typedarray_type.napi_uint32_array
    } else if (v instanceof Float32Array) {
      t = napi_typedarray_type.napi_float32_array
    } else if (v instanceof Float64Array) {
      t = napi_typedarray_type.napi_float64_array
    } else if (v instanceof BigInt64Array) {
      t = napi_typedarray_type.napi_bigint64_array
    } else if (v instanceof BigUint64Array) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      t = napi_typedarray_type.napi_biguint64_array
    } else {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    makeSetValue('type', 0, 't', 'i32')
  }
  if (length) {
    from64('length')
    makeSetValue('length', 0, 'v.length', SIZE_TYPE)
  }
  let buffer: ArrayBufferLike
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(buffer)
      makeSetValue('arraybuffer', 0, 'ab', '*')
    }
  }
  if (byte_offset) {
    from64('byte_offset')
    makeSetValue('byte_offset', 0, 'v.byteOffset', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function napi_get_buffer_info (
  env: napi_env,
  buffer: napi_value,
  data: void_pp,
  length: Pointer<size_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, buffer)
  const handle = emnapiCtx.handleStore.get(buffer)!
  $RETURN_STATUS_IF_FALSE!(envObject, handle.isBuffer(emnapiCtx.feature.Buffer), napi_status.napi_invalid_arg)
  if (handle.isDataView()) {
    return napi_get_dataview_info(env, buffer, length, data, 0, 0)
  }
  return napi_get_typedarray_info(env, buffer, 0, length, data, 0, 0)
}

/**
 * @__sig ipppppp
 */
export function napi_get_dataview_info (
  env: napi_env,
  dataview: napi_value,
  byte_length: Pointer<size_t>,
  data: void_pp,
  arraybuffer: Pointer<napi_value>,
  byte_offset: Pointer<size_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, dataview)
  const handle = emnapiCtx.handleStore.get(dataview)!
  if (!handle.isDataView()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v = handle.value as DataView
  if (byte_length) {
    from64('byte_length')
    makeSetValue('byte_length', 0, 'v.byteLength', SIZE_TYPE)
  }
  let buffer: ArrayBufferLike
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(buffer)
      makeSetValue('arraybuffer', 0, 'ab', '*')
    }
  }
  if (byte_offset) {
    from64('byte_offset')
    makeSetValue('byte_offset', 0, 'v.byteOffset', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_date_value (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (!handle.isDate()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    from64('result')
    v = (handle.value as Date).valueOf()
    makeSetValue('result', 0, 'v', 'double')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ippp
 */
export function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'boolean') {
    return envObject.setLastError(napi_status.napi_boolean_expected)
  }
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const r = handle.value ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_value_double (env: napi_env, value: napi_value, result: Pointer<double>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const r = handle.value
  makeSetValue('result', 0, 'r', 'double')
  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function napi_get_value_bigint_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>, lossless: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.feature.supportBigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  const handle = emnapiCtx.handleStore.get(value)!
  let numberValue = handle.value
  if (typeof numberValue !== 'bigint') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('lossless')
  from64('result')
  if ((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63)))) {
    makeSetValue('lossless', 0, '1', 'i8')
  } else {
    makeSetValue('lossless', 0, '0', 'i8')
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
    if (numberValue >= (BigInt(1) << BigInt(63))) {
      numberValue = numberValue - (BigInt(1) << BigInt(64))
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const low = Number(numberValue & BigInt(0xffffffff))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const high = Number(numberValue >> BigInt(32))
  makeSetValue('result', 0, 'low', 'i32')
  makeSetValue('result', 4, 'high', 'i32')
  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function napi_get_value_bigint_uint64 (env: napi_env, value: napi_value, result: Pointer<uint64_t>, lossless: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.feature.supportBigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  const handle = emnapiCtx.handleStore.get(value)!
  let numberValue = handle.value
  if (typeof numberValue !== 'bigint') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('lossless')
  from64('result')
  if ((numberValue >= BigInt(0)) && (numberValue < (BigInt(1) << BigInt(64)))) {
    makeSetValue('lossless', 0, '1', 'i8')
  } else {
    makeSetValue('lossless', 0, '0', 'i8')
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const low = Number(numberValue & BigInt(0xffffffff))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const high = Number(numberValue >> BigInt(32))
  makeSetValue('result', 0, 'low', 'u32')
  makeSetValue('result', 4, 'high', 'u32')
  return envObject.clearLastError()
}

/**
 * @__sig ippppp
 */
export function napi_get_value_bigint_words (
  env: napi_env,
  value: napi_value,
  sign_bit: Pointer<int>,
  word_count: Pointer<size_t>,
  words: Pointer<uint64_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.feature.supportBigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, word_count)
  const handle = emnapiCtx.handleStore.get(value)!
  if (!handle.isBigInt()) {
    return envObject.setLastError(napi_status.napi_bigint_expected)
  }
  const isMinus = handle.value < BigInt(0)

  from64('sign_bit')
  from64('words')
  from64('word_count')

  let word_count_int = makeGetValue('word_count', 0, SIZE_TYPE) as number
  from64('word_count_int')

  let wordCount = 0
  let bigintValue: bigint = isMinus ? (handle.value * BigInt(-1)) : handle.value
  while (bigintValue !== BigInt(0)) {
    wordCount++
    bigintValue = bigintValue >> BigInt(64)
  }
  bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value
  if (!sign_bit && !words) {
    word_count_int = wordCount
    makeSetValue('word_count', 0, 'word_count_int', SIZE_TYPE)
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const low = Number(wordsArr[i] & BigInt(0xffffffff))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const high = Number(wordsArr[i] >> BigInt(32))
      makeSetValue('words', 'i * 8', 'low', 'u32')
      makeSetValue('words', 'i * 8 + 4', 'high', 'u32')
    }
    makeSetValue('sign_bit', 0, 'isMinus ? 1 : 0', 'i32')
    makeSetValue('word_count', 0, 'len', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_value_external (env: napi_env, value: napi_value, result: void_pp): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (!handle.isExternal()) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const p = handle.data()
  makeSetValue('result', 0, 'p', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_value_int32 (env: napi_env, value: napi_value, result: Pointer<int32_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = new Int32Array([handle.value])[0]
  makeSetValue('result', 0, 'v', 'i32')
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_value_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  const numberValue = handle.value
  from64('result')

  if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
    makeSetValue('result', 0, '0', 'i32')
    makeSetValue('result', 4, '0', 'i32')
  } else if (numberValue < /* INT64_RANGE_NEGATIVE */ -9223372036854776000) {
    makeSetValue('result', 0, '0', 'i32')
    makeSetValue('result', 4, '0x80000000', 'i32')
  } else if (numberValue >= /* INT64_RANGE_POSITIVE */ 9223372036854776000) {
    makeSetValue('result', 0, '0xffffffff', 'u32')
    makeSetValue('result', 4, '0x7fffffff', 'u32')
  } else {
    emnapiSetValueI64(result, Math.trunc(numberValue))
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippppp
 */
export function napi_get_value_string_latin1 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  from64('result')
  from64('buf')
  from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    makeSetValue('result', 0, 'handle.value.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    let copied: number = 0
    let v: number
    for (let i = 0; i < buf_size - 1; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      v = handle.value.charCodeAt(i) & 0xff
      makeSetValue('buf', 'i', 'v', 'u8')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      copied++
    }
    makeSetValue('buf', 'copied', '0', 'u8')
    if (result) {
      makeSetValue('result', 0, 'copied', SIZE_TYPE)
    }
  } else if (result) {
    makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippppp
 */
export function napi_get_value_string_utf8 (env: napi_env, value: napi_value, buf: char_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  from64('result')
  from64('buf')
  from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const strLength = emnapiString.lengthBytesUTF8(handle.value)
    makeSetValue('result', 0, 'strLength', SIZE_TYPE)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = emnapiString.stringToUTF8(handle.value, buf, buf_size)
    if (result) {
      makeSetValue('result', 0, 'copied', SIZE_TYPE)
    }
  } else if (result) {
    makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippppp
 */
export function napi_get_value_string_utf16 (env: napi_env, value: napi_value, buf: char16_t_p, buf_size: size_t, result: Pointer<size_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  from64('result')
  from64('buf')
  from64('buf_size')

  buf_size = buf_size >>> 0
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    makeSetValue('result', 0, 'handle.value.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = emnapiString.stringToUTF16(handle.value, buf, buf_size * 2)
    if (result) {
      makeSetValue('result', 0, 'copied / 2', SIZE_TYPE)
    }
  } else if (result) {
    makeSetValue('result', 0, '0', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_value_uint32 (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const handle = emnapiCtx.handleStore.get(value)!
  if (typeof handle.value !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = new Uint32Array([handle.value])[0]
  makeSetValue('result', 0, 'v', 'u32')
  return envObject.clearLastError()
}
