/* eslint-disable @typescript-eslint/indent */

function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(value >>> 0)
      $makeSetValue('result', 0, 'v', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    let checkList: number[]
// #if WASM_BIGINT
    checkList = [high]
// #else
    checkList = [result]
// #endif
    return emnapiCtx.checkArgs(envObject, checkList, () => {
      let value: number

// #if WASM_BIGINT
      value = Number(low)
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v1 = emnapiCtx.addToCurrentScope(value)
      $from64('high')
      $makeSetValue('high', 0, 'v1', '*')
// #else
      value = (low >>> 0) + (high * Math.pow(2, 32))
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v2 = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v2', '*')
// #endif
      return envObject.clearLastError()
    })
  })
}

function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_latin1 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
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
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(latin1String)
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('str')
      $from64('length')

      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      const utf16String = length === -1 ? UTF16ToString(str) : UTF16ToString(str, length * 2)
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(utf16String)
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('str')
      $from64('length')

      length = length >>> 0
      if (!((length === 0xffffffff) || (length <= 2147483647)) || (!str)) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(utf8String)
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    if (!emnapiRt.supportBigInt) {
      envObject.tryCatch.setError(new emnapiRt.NotSupportBigIntError('napi_create_bigint_int64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    let checkList: number[]
    // #if WASM_BIGINT
    checkList = [high]
    // #else
    checkList = [result]
    // #endif
    return emnapiCtx.checkArgs(envObject, checkList, () => {
      let value: BigInt

// #if WASM_BIGINT
      value = low as unknown as BigInt
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v1 = emnapiCtx.addToCurrentScope(value)
      $from64('high')
      $makeSetValue('high', 0, 'v1', '*')
// #else
      value = BigInt(low >>> 0) | (BigInt(high) << BigInt(32))
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v2 = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v2', '*')
// #endif
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_uint64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    if (!emnapiRt.supportBigInt) {
      envObject.tryCatch.setError(new emnapiRt.NotSupportBigIntError('napi_create_bigint_uint64', 'This API is unavailable'))
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
    let checkList: number[]
    // #if WASM_BIGINT
    checkList = [high]
    // #else
    checkList = [result]
    // #endif
    return emnapiCtx.checkArgs(envObject, checkList, () => {
      let value: BigInt

// #if WASM_BIGINT
      value = low as unknown as BigInt
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v1 = emnapiCtx.addToCurrentScope(value)
      $from64('high')
      $makeSetValue('high', 0, 'v1', '*')
// #else
      value = BigInt(low >>> 0) | (BigInt(high >>> 0) << BigInt(32))
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v2 = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v2', '*')
// #endif
      return envObject.clearLastError()
    })
  })
}

function napi_create_bigint_words (env: napi_env, sign_bit: int, word_count: size_t, words: Const<Pointer<uint64_t>>, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    if (!emnapiRt.supportBigInt) {
      throw new emnapiRt.NotSupportBigIntError('napi_create_bigint_words', 'This API is unavailable')
    }
    return emnapiCtx.checkArgs(envObject, [result], () => {
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
      for (let i = 0; i < word_count; i++) {
        const low = HEAPU32[(words + (i * 8)) >> 2]
        const high = HEAPU32[(words + (i * 8) + 4) >> 2]
        const wordi = BigInt(low) | (BigInt(high) << BigInt(32))
        value += wordi << BigInt(64 * i)
      }
      value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1))
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(value)
      $makeSetValue('result', 0, 'v', '*')
      return envObject.clearLastError()
    })
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

// #if typeof LEGACY_RUNTIME !== 'undefined' && !LEGACY_RUNTIME
emnapiImplement('napi_create_string_utf16', 'ipppp', napi_create_string_utf16, ['$UTF16ToString'])
// #else
emnapiImplement('napi_create_string_utf16', 'ipppp', napi_create_string_utf16)
// #endif

emnapiImplement('napi_create_string_utf8', 'ipppp', napi_create_string_utf8)
