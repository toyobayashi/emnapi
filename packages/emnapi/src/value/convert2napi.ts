/* eslint-disable @typescript-eslint/indent */

import { emnapiCtx } from 'emnapi:shared'
import { from64, makeGetValue, makeSetValue } from 'emscripten:parse-tools'
import { emnapiString } from '../string'
import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $PREAMBLE } from '../macro'

/**
 * @__sig ipip
 */
export function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value).id
  makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ipip
 */
export function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value >>> 0).id
  makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ipjp
 */
export function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)

  let value: number

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = Number(low)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  from64('high')
  makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = (low >>> 0) + (high * Math.pow(2, 32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

/**
 * @__sig ipdp
 */
export function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v = emnapiCtx.addToCurrentScope(value).id
  makeSetValue('result', 0, 'v', '*')
  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function napi_create_string_latin1 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiString.newString(env, str, length, result, (str, autoLength, sizeLength) => {
    let latin1String = ''
    let len = 0
    if (autoLength) {
      while (true) {
        const ch = makeGetValue('str', 0, 'u8') as number
        if (!ch) break
        latin1String += String.fromCharCode(ch)
        str++
      }
    } else {
      while (len < sizeLength) {
        const ch = makeGetValue('str', 0, 'u8') as number
        if (!ch) break
        latin1String += String.fromCharCode(ch)
        len++
        str++
      }
    }
    return latin1String
  })
}

/**
 * @__sig ipppp
 */
export function napi_create_string_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiString.newString(env, str, length, result, (str) => {
    return emnapiString.UTF16ToString(str, length)
  })
}

/**
 * @__sig ipppp
 */
export function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return emnapiString.newString(env, str, length, result, (str) => {
    return emnapiString.UTF8ToString(str, length)
  })
}

/**
 * @__sig ippppppp
 */
export function node_api_create_external_string_latin1 (
  env: napi_env,
  str: number,
  length: size_t,
  finalize_callback: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>,
  copied: Pointer<bool>
): napi_status {
  return emnapiString.newExternalString(
    env,
    str,
    length,
    finalize_callback,
    finalize_hint,
    result,
    copied,
    napi_create_string_latin1,
    undefined!
  )
}

/**
 * @__sig ippppppp
 */
export function node_api_create_external_string_utf16 (
  env: napi_env,
  str: number,
  length: size_t,
  finalize_callback: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>,
  copied: Pointer<bool>
): napi_status {
  return emnapiString.newExternalString(
    env,
    str,
    length,
    finalize_callback,
    finalize_hint,
    result,
    copied,
    napi_create_string_utf16,
    undefined!
  )
}

/**
 * @__sig ipppp
 */
export function node_api_create_property_key_latin1 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return napi_create_string_latin1(env, str, length, result)
}

/**
 * @__sig ipppp
 */
export function node_api_create_property_key_utf8 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return napi_create_string_utf8(env, str, length, result)
}

/**
 * @__sig ipppp
 */
export function node_api_create_property_key_utf16 (env: napi_env, str: const_char16_t_p, length: size_t, result: Pointer<napi_value>): napi_status {
  return napi_create_string_utf16(env, str, length, result)
}

/**
 * @__sig ipjp
 */
export function napi_create_bigint_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.feature.supportBigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  let value: bigint

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = low as unknown as bigint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  from64('high')
  makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = BigInt(low >>> 0) | (BigInt(high) << BigInt(32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

/**
 * @__sig ipjp
 */
export function napi_create_bigint_uint64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  if (!emnapiCtx.feature.supportBigInt) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  let value: bigint

// #if WASM_BIGINT
  if (!high) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = (low as unknown as bigint) & ((BigInt(1) << BigInt(64)) - BigInt(1))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v1 = emnapiCtx.addToCurrentScope(value).id
  from64('high')
  makeSetValue('high', 0, 'v1', '*')
// #else
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
  value = BigInt(low >>> 0) | (BigInt(high >>> 0) << BigInt(32))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const v2 = emnapiCtx.addToCurrentScope(value).id
  makeSetValue('result', 0, 'v2', '*')
// #endif

  return envObject.clearLastError()
}

/**
 * @__sig ipippp
 */
export function napi_create_bigint_words (env: napi_env, sign_bit: int, word_count: size_t, words: Const<Pointer<uint64_t>>, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number, i: number

  return $PREAMBLE!(env, (envObject) => {
    if (!emnapiCtx.feature.supportBigInt) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    $CHECK_ARG!(envObject, result)
    from64('words')
    from64('word_count')
    word_count = word_count >>> 0
    if (word_count > 2147483647) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
      throw new RangeError('Maximum BigInt size exceeded')
    }
    let value: bigint = BigInt(0)
    for (i = 0; i < word_count; i++) {
      const low = makeGetValue('words', 'i * 8', 'u32')
      const high = makeGetValue('words', 'i * 8 + 4', 'u32')
      const wordi = BigInt(low) | (BigInt(high) << BigInt(32))
      value += wordi << BigInt(64 * i)
    }
    value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1))
    from64('result')
    v = emnapiCtx.addToCurrentScope(value).id
    makeSetValue('result', 0, 'v', '*')
    return envObject.getReturnStatus()
  })
}
