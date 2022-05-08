function napi_create_array (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add([]).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_array_with_length (env: napi_env, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new Array(length >>> 0)).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_arraybuffer (env: napi_env, byte_length: size_t, _data: void_pp, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      byte_length = byte_length >>> 0
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new ArrayBuffer(byte_length)).id
      return envObject.getReturnStatus()
    })
  })
}

function napi_create_date (env: napi_env, time: double, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new Date(time)).id
      return envObject.getReturnStatus()
    })
  })
}

function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(emnapi.napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      const externalHandle = emnapi.ExternalHandle.createExternal(env, data)
      envObject.getCurrentScope().addHandle(externalHandle)
      emnapi.Reference.create(env, externalHandle.id, 0, true, finalize_cb, data, finalize_hint)
      HEAP32[result >> 2] = externalHandle.id
      return envObject.clearLastError()
    })
  })
}

function napi_create_external_arraybuffer (
  env: napi_env,
  _external_data: void_p,
  _byte_length: size_t,
  _finalize_cb: napi_finalize,
  _finalize_hint: void_p,
  _result: Pointer<napi_value>
): emnapi.napi_status {
  return _napi_set_last_error(env, emnapi.napi_status.napi_generic_failure, 0, 0)
}

function napi_create_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add({}).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_symbol (env: napi_env, description: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      if (description === emnapi.NULL) {
        // eslint-disable-next-line symbol-description
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol()).id
      } else {
        const handle = envObject.handleStore.get(description)!
        const desc = handle.value
        if (typeof desc !== 'string') {
          return envObject.setLastError(emnapi.napi_status.napi_string_expected)
        }
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol(desc)).id
      }
      return envObject.clearLastError()
    })
  })
}

function napi_create_typedarray (
  env: napi_env,
  type: emnapi.napi_typedarray_type,
  length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [arraybuffer, result], () => {
      length = length >>> 0
      byte_offset = byte_offset >>> 0
      const handle = envObject.handleStore.get(arraybuffer)!
      const buffer = handle.value
      if (!(buffer instanceof ArrayBuffer)) {
        return envObject.setLastError(emnapi.napi_status.napi_invalid_arg)
      }

      const retCallback = (out: ArrayBufferView): emnapi.napi_status => {
        HEAP32[result >> 2] = envObject.getCurrentScope().add(out).id
        return envObject.getReturnStatus()
      }

      switch (type) {
        case emnapi.napi_typedarray_type.napi_int8_array:
          return emnapiCreateTypedArray(env, Int8Array, 1, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_uint8_array:
          return emnapiCreateTypedArray(env, Uint8Array, 1, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_uint8_clamped_array:
          return emnapiCreateTypedArray(env, Uint8ClampedArray, 1, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_int16_array:
          return emnapiCreateTypedArray(env, Int16Array, 2, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_uint16_array:
          return emnapiCreateTypedArray(env, Uint16Array, 2, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_int32_array:
          return emnapiCreateTypedArray(env, Int32Array, 4, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_uint32_array:
          return emnapiCreateTypedArray(env, Uint32Array, 4, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_float32_array:
          return emnapiCreateTypedArray(env, Float32Array, 4, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_float64_array:
          return emnapiCreateTypedArray(env, Float64Array, 8, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_bigint64_array:
          return emnapiCreateTypedArray(env, BigInt64Array, 8, buffer, byte_offset, length, retCallback)
        case emnapi.napi_typedarray_type.napi_biguint64_array:
          return emnapiCreateTypedArray(env, BigUint64Array, 8, buffer, byte_offset, length, retCallback)
        default:
          return envObject.setLastError(emnapi.napi_status.napi_invalid_arg)
      }
    })
  })
}

function napi_create_dataview (
  env: napi_env,
  byte_length: size_t,
  arraybuffer: napi_value,
  byte_offset: size_t,
  result: Pointer<napi_value>
): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [arraybuffer, result], () => {
      byte_length = byte_length >>> 0
      byte_offset = byte_offset >>> 0
      const handle = envObject.handleStore.get(arraybuffer)!
      const buffer = handle.value
      if (!(buffer instanceof ArrayBuffer)) {
        return envObject.setLastError(emnapi.napi_status.napi_invalid_arg)
      }

      if ((byte_length + byte_offset) > buffer.byteLength) {
        const err: RangeError & { code?: string } = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in')
        err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS'
        envObject.tryCatch.setError(err)
        return envObject.setLastError(emnapi.napi_status.napi_pending_exception)
      }

      const dataview = new DataView(buffer, byte_offset, byte_length)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(dataview).id
      return envObject.getReturnStatus()
    })
  })
}

function node_api_symbol_for (env: napi_env, utf8description: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const descriptionString = length === -1 ? UTF8ToString(utf8description) : UTF8ToString(utf8description, length)
      HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol.for(descriptionString)).id
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_create_array', napi_create_array)
emnapiImplement('napi_create_array_with_length', napi_create_array_with_length)
emnapiImplement('napi_create_arraybuffer', napi_create_arraybuffer)
emnapiImplement('napi_create_date', napi_create_date)
emnapiImplement('napi_create_external', napi_create_external)
emnapiImplement('napi_create_external_arraybuffer', napi_create_external_arraybuffer, ['napi_set_last_error'])
emnapiImplement('napi_create_object', napi_create_object)
emnapiImplement('napi_create_symbol', napi_create_symbol)
emnapiImplement('napi_create_typedarray', napi_create_typedarray, ['$emnapiCreateTypedArray'])
emnapiImplement('napi_create_dataview', napi_create_dataview)
emnapiImplement('node_api_symbol_for', node_api_symbol_for)
