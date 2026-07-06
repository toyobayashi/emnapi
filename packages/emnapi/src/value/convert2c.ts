import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory } from 'emscripten:runtime'
import { from64 } from 'emscripten:parse-tools'
import { $emnapiSetValueI64 as emnapiSetValueI64 } from '../util'
import { emnapiString } from '../string'
import { emnapiExternalMemory } from '../memory'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $PREAMBLE, $RETURN_STATUS_IF_FALSE } from '../macro'
import { emnapiMemory } from '../memory-view'

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
    emnapiMemory.setUint32(wasmMemory, result as number, v)
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
    emnapiMemory.setPointer(wasmMemory, data as number, p)
  }
  if (byte_length) {
    from64('byte_length')
    emnapiMemory.setSizeType(wasmMemory, byte_length as number, handle.value.byteLength)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function node_api_set_prototype (env: napi_env, object: napi_value, value: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    const obj = emnapiCtx.handleStore.get(object)!.value
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
    const val = emnapiCtx.handleStore.get(value)!.value
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
    emnapiMemory.setPointer(wasmMemory, result as number, p)
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
  let v: ArrayBufferView = handle.value
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
    } else if (typeof Float16Array === 'function' && v instanceof Float16Array) {
      t = napi_typedarray_type.napi_float16_array
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
    emnapiMemory.setInt32(wasmMemory, type as number, t)
  }
  v = emnapiExternalMemory.getOrUpdateMemoryView(v)
  if (length) {
    from64('length')
    emnapiMemory.setSizeType(wasmMemory, length as number, (v as any).length)
  }

  if (data || arraybuffer) {
    if (data) {
      from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      emnapiMemory.setPointer(wasmMemory, data as number, p)
    }
    if (arraybuffer) {
      from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(v.buffer)
      emnapiMemory.setPointer(wasmMemory, arraybuffer as number, ab)
    }
  }
  if (byte_offset) {
    from64('byte_offset')
    emnapiMemory.setSizeType(wasmMemory, byte_offset as number, v.byteOffset)
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
  const v = emnapiExternalMemory.getOrUpdateMemoryView(handle.value as DataView<ArrayBufferLike>)
  if (byte_length) {
    from64('byte_length')
    emnapiMemory.setSizeType(wasmMemory, byte_length as number, v.byteLength)
  }

  if (data || arraybuffer) {
    if (data) {
      from64('data')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const p: number = emnapiExternalMemory.getViewPointer(v, true).address
      emnapiMemory.setPointer(wasmMemory, data as number, p)
    }
    if (arraybuffer) {
      from64('arraybuffer')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ab = envObject.ensureHandleId(v.buffer)
      emnapiMemory.setPointer(wasmMemory, arraybuffer as number, ab)
    }
  }
  if (byte_offset) {
    from64('byte_offset')
    emnapiMemory.setSizeType(wasmMemory, byte_offset as number, v.byteOffset)
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
    emnapiMemory.setFloat64(wasmMemory, result as number, v)
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
  emnapiMemory.setInt8(wasmMemory, result as number, r)
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
  emnapiMemory.setFloat64(wasmMemory, result as number, r)
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
    emnapiMemory.setInt8(wasmMemory, lossless as number, 1)
  } else {
    emnapiMemory.setInt8(wasmMemory, lossless as number, 0)
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
    if (numberValue >= (BigInt(1) << BigInt(63))) {
      numberValue = numberValue - (BigInt(1) << BigInt(64))
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const low = Number(numberValue & BigInt(0xffffffff))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const high = Number(numberValue >> BigInt(32))
  emnapiMemory.setInt32(wasmMemory, result as number, low)
  emnapiMemory.setInt32(wasmMemory, result as number + 4, high)
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
    emnapiMemory.setInt8(wasmMemory, lossless as number, 1)
  } else {
    emnapiMemory.setInt8(wasmMemory, lossless as number, 0)
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const low = Number(numberValue & BigInt(0xffffffff))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const high = Number(numberValue >> BigInt(32))
  emnapiMemory.setUint32(wasmMemory, result as number, low)
  emnapiMemory.setUint32(wasmMemory, result as number + 4, high)
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

  let word_count_int = emnapiMemory.getSizeType(wasmMemory, word_count as number)
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
    emnapiMemory.setSizeType(wasmMemory, word_count as number, word_count_int)
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
      emnapiMemory.setUint32(wasmMemory, words as number + i * 8, low)
      emnapiMemory.setUint32(wasmMemory, words as number + i * 8 + 4, high)
    }
    emnapiMemory.setInt32(wasmMemory, sign_bit as number, isMinus ? 1 : 0)
    emnapiMemory.setSizeType(wasmMemory, word_count as number, len)
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
  emnapiMemory.setPointer(wasmMemory, result as number, p)
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
  emnapiMemory.setInt32(wasmMemory, result as number, v)
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
    emnapiMemory.setInt32(wasmMemory, result as number, 0)
    emnapiMemory.setInt32(wasmMemory, result as number + 4, 0)
  } else if (numberValue < /* INT64_RANGE_NEGATIVE */ -9223372036854776000) {
    emnapiMemory.setInt32(wasmMemory, result as number, 0)
    emnapiMemory.setInt32(wasmMemory, result as number + 4, 0x80000000)
  } else if (numberValue >= /* INT64_RANGE_POSITIVE */ 9223372036854776000) {
    emnapiMemory.setUint32(wasmMemory, result as number, 0xffffffff)
    emnapiMemory.setUint32(wasmMemory, result as number + 4, 0x7fffffff)
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
    emnapiMemory.setSizeType(wasmMemory, result as number, handle.value.length)
  } else if (buf_size !== 0) {
    let copied: number = 0
    let v: number
    let HEAPU8 = emnapiMemory.getUint8Array(wasmMemory, buf as number + 1)
    for (let i = 0; i < buf_size - 1; ++i) {
      v = handle.value.charCodeAt(i) & 0xff
      const address = buf as number + i
      if (address + 1 > HEAPU8.byteLength) {
        HEAPU8 = emnapiMemory.getUint8Array(wasmMemory, address + 1)
      }
      HEAPU8[address] = v
      copied++
    }
    const terminator = buf as number + copied
    if (terminator + 1 > HEAPU8.byteLength) {
      HEAPU8 = emnapiMemory.getUint8Array(wasmMemory, terminator + 1)
    }
    HEAPU8[terminator] = 0
    if (result) {
      emnapiMemory.setSizeType(wasmMemory, result as number, copied)
    }
  } else if (result) {
    emnapiMemory.setSizeType(wasmMemory, result as number, 0)
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
    emnapiMemory.setSizeType(wasmMemory, result as number, strLength)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = emnapiString.stringToUTF8(handle.value, buf, buf_size)
    if (result) {
      emnapiMemory.setSizeType(wasmMemory, result as number, copied)
    }
  } else if (result) {
    emnapiMemory.setSizeType(wasmMemory, result as number, 0)
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
    emnapiMemory.setSizeType(wasmMemory, result as number, handle.value.length)
  } else if (buf_size !== 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copied = emnapiString.stringToUTF16(handle.value, buf, buf_size * 2)
    if (result) {
      emnapiMemory.setSizeType(wasmMemory, result as number, copied / 2)
    }
  } else if (result) {
    emnapiMemory.setSizeType(wasmMemory, result as number, 0)
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
  emnapiMemory.setUint32(wasmMemory, result as number, v)
  return envObject.clearLastError()
}
