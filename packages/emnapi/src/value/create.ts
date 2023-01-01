function napi_create_array (env: napi_env, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope([]).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_array_with_length (env: napi_env, length: size_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('length')
  $from64('result')
  length = length >>> 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(new Array(length)).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

// @ts-expect-error
function napi_create_arraybuffer (env: napi_env, byte_length: size_t, _data: void_pp, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $from64('byte_length')
    $from64('result')
    byte_length = byte_length >>> 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(new ArrayBuffer(byte_length)).id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_create_date (env: napi_env, time: double, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(new Date(time)).id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    if (!emnapiRt.supportFinalizer && finalize_cb) {
      throw new emnapiRt.NotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const externalHandle = emnapiCtx.getCurrentScope()!.addExternal(data)
    if (finalize_cb) {
      emnapiRt.Reference.create(envObject, externalHandle.id, 0, emnapiRt.Ownership.kRuntime, finalize_cb, data, finalize_hint)
    }
    $from64('result')
    value = externalHandle.id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.clearLastError()
  })
}

/* function napi_create_external_arraybuffer (
  env: napi_env,
  _external_data: void_p,
  _byte_length: size_t,
  _finalize_cb: napi_finalize,
  _finalize_hint: void_p,
  _result: Pointer<napi_value>
): napi_status {
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
} */

function napi_create_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope({}).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_symbol (env: napi_env, description: napi_value, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('result')

  if (!description) {
    // eslint-disable-next-line symbol-description, @typescript-eslint/no-unused-vars
    const value = emnapiCtx.addToCurrentScope(Symbol()).id
    $makeSetValue('result', 0, 'value', '*')
  } else {
    const handle = emnapiCtx.handleStore.get(description)!
    const desc = handle.value
    if (typeof desc !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = emnapiCtx.addToCurrentScope(Symbol(desc)).id
    $makeSetValue('result', 0, 'v', '*')
  }
  return envObject.clearLastError()
}

function napi_create_typedarray (
  env: napi_env,
  type: napi_typedarray_type,
  length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
// @ts-expect-error
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)

    const handle = emnapiCtx.handleStore.get(arraybuffer)!
    const buffer = handle.value
    if (!(buffer instanceof ArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    const retCallback = (out: ArrayBufferView): napi_status => {
      $from64('result')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value = emnapiCtx.addToCurrentScope(out).id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    }

    switch (type) {
      case napi_typedarray_type.napi_int8_array:
        return emnapiCreateTypedArray(envObject, Int8Array, 1, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_uint8_array:
        return emnapiCreateTypedArray(envObject, Uint8Array, 1, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_uint8_clamped_array:
        return emnapiCreateTypedArray(envObject, Uint8ClampedArray, 1, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_int16_array:
        return emnapiCreateTypedArray(envObject, Int16Array, 2, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_uint16_array:
        return emnapiCreateTypedArray(envObject, Uint16Array, 2, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_int32_array:
        return emnapiCreateTypedArray(envObject, Int32Array, 4, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_uint32_array:
        return emnapiCreateTypedArray(envObject, Uint32Array, 4, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_float32_array:
        return emnapiCreateTypedArray(envObject, Float32Array, 4, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_float64_array:
        return emnapiCreateTypedArray(envObject, Float64Array, 8, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_bigint64_array:
        return emnapiCreateTypedArray(envObject, BigInt64Array, 8, buffer, byte_offset, length, retCallback)
      case napi_typedarray_type.napi_biguint64_array:
        return emnapiCreateTypedArray(envObject, BigUint64Array, 8, buffer, byte_offset, length, retCallback)
      default:
        return envObject.setLastError(napi_status.napi_invalid_arg)
    }
  })
}

function napi_create_dataview (
  env: napi_env,
  byte_length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
// @ts-expect-error
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    $from64('byte_length')
    $from64('byte_offset')
    byte_length = byte_length >>> 0
    byte_offset = byte_offset >>> 0
    const handle = emnapiCtx.handleStore.get(arraybuffer)!
    const buffer = handle.value
    if (!(buffer instanceof ArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    if ((byte_length + byte_offset) > buffer.byteLength) {
      const err: RangeError & { code?: string } = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in')
      err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS'
      envObject.tryCatch.setError(err)
      return envObject.setLastError(napi_status.napi_pending_exception)
    }

    const dataview = new DataView(buffer, byte_offset, byte_length)
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(dataview).id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

function node_api_symbol_for (env: napi_env, utf8description: const_char_p, length: size_t, result: Pointer<napi_value>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  $from64('length')
  $from64('utf8description')
  $from64('result')

  const descriptionString = length === -1 ? UTF8ToString(utf8description) : UTF8ToString(utf8description, length)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(Symbol.for(descriptionString)).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

emnapiImplement('napi_create_array', 'ipp', napi_create_array)
emnapiImplement('napi_create_array_with_length', 'ippp', napi_create_array_with_length)
emnapiImplement('napi_create_arraybuffer', 'ipppp', napi_create_arraybuffer)
emnapiImplement('napi_create_date', 'ipdp', napi_create_date)
emnapiImplement('napi_create_external', 'ippppp', napi_create_external)
// emnapiImplement('napi_create_external_arraybuffer', napi_create_external_arraybuffer, ['napi_set_last_error'])
emnapiImplement('napi_create_object', 'ipp', napi_create_object)
emnapiImplement('napi_create_symbol', 'ippp', napi_create_symbol)
emnapiImplement('napi_create_typedarray', 'ipipppp', napi_create_typedarray, ['$emnapiCreateTypedArray'])
emnapiImplement('napi_create_dataview', 'ippppp', napi_create_dataview)
emnapiImplement('node_api_symbol_for', 'ipppp', node_api_symbol_for)
