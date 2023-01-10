function napi_typeof (env: napi_env, value: napi_value, result: Pointer<napi_valuetype>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const v = emnapiCtx.handleStore.get(value)!
  $from64('result')
  if (v.isNumber()) {
    HEAP32[result >> 2] = napi_valuetype.napi_number
  } else if (v.isBigInt()) {
    HEAP32[result >> 2] = napi_valuetype.napi_bigint
  } else if (v.isString()) {
    HEAP32[result >> 2] = napi_valuetype.napi_string
  } else if (v.isFunction()) {
  // This test has to come before IsObject because IsFunction
  // implies IsObject
    HEAP32[result >> 2] = napi_valuetype.napi_function
  } else if (v.isExternal()) {
  // This test has to come before IsObject because IsExternal
  // implies IsObject
    HEAP32[result >> 2] = napi_valuetype.napi_external
  } else if (v.isObject()) {
    HEAP32[result >> 2] = napi_valuetype.napi_object
  } else if (v.isBoolean()) {
    HEAP32[result >> 2] = napi_valuetype.napi_boolean
  } else if (v.isUndefined()) {
    HEAP32[result >> 2] = napi_valuetype.napi_undefined
  } else if (v.isSymbol()) {
    HEAP32[result >> 2] = napi_valuetype.napi_symbol
  } else if (v.isNull()) {
    HEAP32[result >> 2] = napi_valuetype.napi_null
  } else {
  // Should not get here unless V8 has added some new kind of value.
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  return envObject.clearLastError()
}

// @ts-expect-error
function napi_coerce_to_bool (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    $from64('result')

    v = handle.value ? GlobalHandle.TRUE : GlobalHandle.FALSE
    $makeSetValue('result', 0, 'v', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_coerce_to_number (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (handle.isBigInt()) {
      throw new TypeError('Cannot convert a BigInt value to a number')
    }
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    v = emnapiCtx.addToCurrentScope(Number(handle.value)).id
    $makeSetValue('result', 0, 'v', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_coerce_to_object (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    v = envObject.ensureHandleId(Object(handle.value))
    $makeSetValue('result', 0, 'v', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_coerce_to_string (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const handle = emnapiCtx.handleStore.get(value)!
    if (handle.isSymbol()) {
      throw new TypeError('Cannot convert a Symbol value to a string')
    }
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    v = emnapiCtx.addToCurrentScope(String(handle.value)).id
    $makeSetValue('result', 0, 'v', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_instanceof (env: napi_env, object: napi_value, constructor: napi_value, result: Pointer<bool>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, object)
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, constructor)
    $from64('result')
    HEAPU8[result] = 0
    const ctor = emnapiCtx.handleStore.get(constructor)!
    if (!ctor.isFunction()) {
      return envObject.setLastError(napi_status.napi_function_expected)
    }
    const val = emnapiCtx.handleStore.get(object)!.value
    const ret = val instanceof ctor.value
    HEAPU8[result] = ret ? 1 : 0
    return envObject.getReturnStatus()
  })
}

function napi_is_array (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isArray() ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_arraybuffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isArrayBuffer() ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_date (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isDate() ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_error (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const val = emnapiCtx.handleStore.get(value)!.value
  $from64('result')
  HEAPU8[result] = val instanceof Error ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_typedarray (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isTypedArray() ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_buffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isBuffer() ? 1 : 0
  return envObject.clearLastError()
}

function napi_is_dataview (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('result')
  HEAPU8[result] = h.isDataView() ? 1 : 0
  return envObject.clearLastError()
}

// @ts-expect-error
function napi_strict_equals (env: napi_env, lhs: napi_value, rhs: napi_value, result: Pointer<bool>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, lhs)
    $CHECK_ARG!(envObject, rhs)
    $CHECK_ARG!(envObject, result)
    const lv = emnapiCtx.handleStore.get(lhs)!.value
    const rv = emnapiCtx.handleStore.get(rhs)!.value
    $from64('result')
    HEAPU8[result] = (lv === rv) ? 1 : 0
    return envObject.getReturnStatus()
  })
}

function napi_detach_arraybuffer (env: napi_env, arraybuffer: napi_value): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, arraybuffer)
  const value = emnapiCtx.handleStore.get(arraybuffer)!.value
  if (!(value instanceof ArrayBuffer)) {
    if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_detachable_arraybuffer_expected)
    }
    return envObject.setLastError(napi_status.napi_arraybuffer_expected)
  }

  try {
    const messageChannel = new MessageChannel()
    messageChannel.port1.postMessage(value, [value])
  } catch (err) {
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
  return envObject.clearLastError()
}

// @ts-expect-error
function napi_is_detached_arraybuffer (env: napi_env, arraybuffer: napi_value, result: Pointer<bool>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    const h = emnapiCtx.handleStore.get(arraybuffer)!
    $from64('result')
    if (h.isArrayBuffer() && h.value.byteLength === 0) {
      try {
        // eslint-disable-next-line no-new
        new Uint8Array(h.value as ArrayBuffer)
      } catch (_) {
        HEAPU8[result] = 1
        return envObject.getReturnStatus()
      }
    }
    HEAPU8[result] = 0
    return envObject.getReturnStatus()
  })
}

emnapiImplement('napi_typeof', 'ippp', napi_typeof)
emnapiImplement('napi_coerce_to_bool', 'ippp', napi_coerce_to_bool)
emnapiImplement('napi_coerce_to_number', 'ippp', napi_coerce_to_number)
emnapiImplement('napi_coerce_to_object', 'ippp', napi_coerce_to_object)
emnapiImplement('napi_coerce_to_string', 'ippp', napi_coerce_to_string)
emnapiImplement('napi_instanceof', 'ipppp', napi_instanceof)
emnapiImplement('napi_is_array', 'ippp', napi_is_array)
emnapiImplement('napi_is_arraybuffer', 'ippp', napi_is_arraybuffer)
emnapiImplement('napi_is_date', 'ippp', napi_is_date)
emnapiImplement('napi_is_error', 'ippp', napi_is_error)
emnapiImplement('napi_is_typedarray', 'ippp', napi_is_typedarray)
emnapiImplement('napi_is_buffer', 'ippp', napi_is_buffer)
emnapiImplement('napi_is_dataview', 'ippp', napi_is_dataview)
emnapiImplement('napi_strict_equals', 'ipppp', napi_strict_equals)
emnapiImplement('napi_detach_arraybuffer', 'ipp', napi_detach_arraybuffer, ['napi_set_last_error'])
emnapiImplement('napi_is_detached_arraybuffer', 'ippp', napi_is_detached_arraybuffer, ['napi_set_last_error'])
