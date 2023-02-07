/* eslint-disable @typescript-eslint/indent */

function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value).id
  $makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value >>> 0).id
  $makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!

  let value: number

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = Number(low)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  $from64('high')
  $makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = (low >>> 0) + (high * Math.pow(2, 32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  $makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value).id
  $makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

function napi_create_string_latin1 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('str')
  $from64('length')
  length = length >>> 0
  if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  let latin1String = ''
  let len = 0
  if (length === -1) {
    while (true) {
      const ch = $makeGetValue('str', 0, 'u8') as number
      if (!ch) break
      latin1String += String.fromCharCode(ch)
      str++
    }
  } else {
    while (len < length) {
      const ch = $makeGetValue('str', 0, 'u8') as number
      if (!ch) break
      latin1String += String.fromCharCode(ch)
      len++
      str++
    }
  }
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(latin1String).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_string_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('str')
  $from64('length')

  if (((length < -1) || (length > 2147483647)) || (!str)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  const utf16String = emnapiUtf16ToString(str, length)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(utf16String).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('str')
  $from64('length')

  if (((length < -1) || (length > 2147483647)) || (!str)) {
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }
  const utf8String = emnapiUtf8ToString(str, length)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(utf8String).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_bigint_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  if (!emnapiCtx.feature.supportBigInt) {
    envObject.tryCatch.setError(emnapiCtx.createNotSupportBigIntError('napi_create_bigint_int64', 'This API is unavailable'))
    return envObject.setLastError(napi_status.napi_pending_exception)
  }

  let value: BigInt

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = low as unknown as BigInt
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  $from64('high')
  $makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = BigInt(low >>> 0) | (BigInt(high) << BigInt(32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  $makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

function napi_create_bigint_uint64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  if (!emnapiCtx.feature.supportBigInt) {
    envObject.tryCatch.setError(emnapiCtx.createNotSupportBigIntError('napi_create_bigint_uint64', 'This API is unavailable'))
    return envObject.setLastError(napi_status.napi_pending_exception)
  }

  let value: BigInt

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = low as unknown as BigInt
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  $from64('high')
  $makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = BigInt(low >>> 0) | (BigInt(high >>> 0) << BigInt(32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  $makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

// @ts-expect-error
function napi_create_bigint_words (env: napi_env, sign_bit: int, word_count: size_t, words: Const<Pointer<uint64_t>>, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number, i: number

  $PREAMBLE!(env, (envObject) => {
    if (!emnapiCtx.feature.supportBigInt) {
      throw emnapiCtx.createNotSupportBigIntError('napi_create_bigint_words', 'This API is unavailable')
    }
    $CHECK_ARG!(envObject, result)
    $from64('words')
    $from64('word_count')
    word_count = word_count >>> 0
    if (word_count > 2147483647) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
      throw new RangeError('Maximum BigInt size exceeded')
    }
    let value: bigint = BigInt(0)
    for (i = 0; i < word_count; i++) {
      const low = $makeGetValue('words', 'i * 8', 'u32')
      const high = $makeGetValue('words', 'i * 8 + 4', 'u32')
      const wordi = BigInt(low) | (BigInt(high) << BigInt(32))
      value += wordi << BigInt(64 * i)
    }
    value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1))
    $from64('result')
    v = emnapiCtx.addToCurrentScope(value).id
    $makeSetValue('result', 0, 'v', '*')
    return envObject.clearLastError()
  })
}

emnapiImplement('napi_create_int32', 'ipip', napi_create_int32)
emnapiImplement('napi_create_uint32', 'ipip', napi_create_uint32)
emnapiImplement('napi_create_int64', 'ipjp', napi_create_int64)
emnapiImplement('napi_create_double', 'ipdp', napi_create_double)
emnapiImplement('napi_create_bigint_int64', 'ipjp', napi_create_bigint_int64)
emnapiImplement('napi_create_bigint_uint64', 'ipjp', napi_create_bigint_uint64)
emnapiImplement('napi_create_bigint_words', 'ipippp', napi_create_bigint_words)
emnapiImplement('napi_create_string_latin1', 'ipppp', napi_create_string_latin1)

emnapiImplement('napi_create_string_utf16', 'ipppp', napi_create_string_utf16, ['$emnapiUtf16ToString'])

emnapiImplement('napi_create_string_utf8', 'ipppp', napi_create_string_utf8, ['$emnapiUtf8ToString'])
