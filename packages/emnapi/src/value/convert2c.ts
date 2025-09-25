import { emnapiCtx } from 'emnapi:shared'
import { SIZE_TYPE, from64, makeGetValue, makeSetValue } from 'emscripten:parse-tools'
import { $emnapiSetValueI64 as emnapiSetValueI64 } from '../util'
import { emnapiString } from '../string'
import { emnapiExternalMemory } from '../memory'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $GET_RETURN_STATUS, $PREAMBLE, $RETURN_STATUS_IF_FALSE } from '../macro'

/**
 * @__sig ippp
 */
export function napi_get_array_length (env: napi_env, value: napi_value, result: Pointer<uint32_t>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (!Array.isArray(jsValue)) {
      return envObject.setLastError(napi_status.napi_array_expected)
    }
    from64('result')

    const v = jsValue.length >>> 0
    makeSetValue('result', 0, 'v', 'u32')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppp
 */
export function napi_get_arraybuffer_info (env: napi_env, arraybuffer: napi_value, data: void_pp, byte_length: Pointer<size_t>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, arraybuffer)
  const jsValue = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
  if (!(jsValue instanceof ArrayBuffer) && !emnapiExternalMemory.isSharedArrayBuffer(jsValue)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  if (data) {
    from64('data')

    const p = emnapiExternalMemory.getArrayBufferPointer(jsValue, true).address
    makeSetValue('data', 0, 'p', '*')
  }
  if (byte_length) {
    from64('byte_length')
    makeSetValue('byte_length', 0, 'jsValue.byteLength', SIZE_TYPE)
  }
  return envObject.clearLastError()
}

/**
 * @__sig ippp
 */
export function napi_get_prototype (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (jsValue == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    const type = typeof jsValue
    let v: any
    try {
      v = (type === 'object' && jsValue !== null) || type === 'function' ? jsValue : Object(jsValue)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_object_expected)
    }
    from64('result')

    const p = emnapiCtx.napiValueFromJsValue(Object.getPrototypeOf(v))
    makeSetValue('result', 0, 'p', '*')
    return $GET_RETURN_STATUS!(envObject)
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(typedarray)!
  if (!(ArrayBuffer.isView(jsValue)) && !(jsValue instanceof DataView)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v: ArrayBufferView = jsValue
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
  let buffer: ArrayBuffer
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      from64('data')

      const p = emnapiExternalMemory.getViewPointer(v, true).address
      makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      from64('arraybuffer')

      const ab = emnapiCtx.napiValueFromJsValue(buffer)
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(buffer)!
  const Buffer = emnapiCtx.features.Buffer
  const bool = (ArrayBuffer.isView(jsValue) || (typeof Buffer === 'function' && Buffer.isBuffer(jsValue)))
  $RETURN_STATUS_IF_FALSE!(envObject, bool, napi_status.napi_invalid_arg)
  if (jsValue instanceof DataView) {
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(dataview)!
  if (!(jsValue instanceof DataView)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const v = jsValue as DataView
  if (byte_length) {
    from64('byte_length')
    makeSetValue('byte_length', 0, 'v.byteLength', SIZE_TYPE)
  }
  let buffer: ArrayBuffer
  if (data || arraybuffer) {
    buffer = v.buffer
    if (data) {
      from64('data')

      const p = emnapiExternalMemory.getViewPointer(v, true).address
      makeSetValue('data', 0, 'p', '*')
    }
    if (arraybuffer) {
      from64('arraybuffer')

      const ab = emnapiCtx.napiValueFromJsValue(buffer)
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
  let v: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (!(jsValue instanceof Date)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    from64('result')
    v = (jsValue as Date).valueOf()
    makeSetValue('result', 0, 'v', 'double')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ippp
 */
export function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'boolean') {
    return envObject.setLastError(napi_status.napi_boolean_expected)
  }
  from64('result')

  const r = jsValue ? 1 : 0
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')

  const r = jsValue
  makeSetValue('result', 0, 'r', 'double')
  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function napi_get_value_bigint_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>, lossless: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.features.BigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  let numberValue = emnapiCtx.jsValueFromNapiValue(value)!
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

  const low = Number(numberValue & BigInt(0xffffffff))

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
  if (!emnapiCtx.features.BigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  $CHECK_ARG!(envObject, lossless)
  let numberValue = emnapiCtx.jsValueFromNapiValue(value)!
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

  const low = Number(numberValue & BigInt(0xffffffff))

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
  if (!emnapiCtx.features.BigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, word_count)
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'bigint') {
    return envObject.setLastError(napi_status.napi_bigint_expected)
  }
  const isMinus = jsValue < BigInt(0)

  from64('sign_bit')
  from64('words')
  from64('word_count')

  let word_count_int = makeGetValue('word_count', 0, SIZE_TYPE) as number
  from64('word_count_int')

  let wordCount = 0
  let bigintValue: bigint = isMinus ? (jsValue * BigInt(-1)) : jsValue
  while (bigintValue !== BigInt(0)) {
    wordCount++
    bigintValue = bigintValue >> BigInt(64)
  }
  bigintValue = isMinus ? (jsValue * BigInt(-1)) : jsValue
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
      const low = Number(wordsArr[i] & BigInt(0xffffffff))

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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (!emnapiCtx.isExternal(jsValue)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  from64('result')

  const p = emnapiCtx.getExternalValue(jsValue)
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')

  const v = new Int32Array([jsValue])[0]
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  const numberValue = jsValue
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    makeSetValue('result', 0, 'jsValue.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    let copied: number = 0
    let v: number
    for (let i = 0; i < buf_size - 1; ++i) {
      v = jsValue.charCodeAt(i) & 0xff
      makeSetValue('buf', 'i', 'v', 'u8')

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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

    const strLength = emnapiString.lengthBytesUTF8(jsValue)
    makeSetValue('result', 0, 'strLength', SIZE_TYPE)
  } else if (buf_size !== 0) {
    const copied = emnapiString.stringToUTF8(jsValue, buf as number, buf_size)
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  if (!buf) {
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    makeSetValue('result', 0, 'jsValue.length', SIZE_TYPE)
  } else if (buf_size !== 0) {
    const copied = emnapiString.stringToUTF16(jsValue, buf as number, buf_size * 2)
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
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  if (typeof jsValue !== 'number') {
    return envObject.setLastError(napi_status.napi_number_expected)
  }
  from64('result')

  const v = new Uint32Array([jsValue])[0]
  makeSetValue('result', 0, 'v', 'u32')
  return envObject.clearLastError()
}
