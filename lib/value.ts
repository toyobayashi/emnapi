function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!

  HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_int64 (env: napi_env, low: int32_t, high: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!

  const value = (low >>> 0) + (high * Math.pow(2, 32))
  HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_uint32 (env: napi_env, value: uint32_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!

  HEAP32[result >> 2] = envObject.getCurrentScope().add(value >>> 0).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_double (env: napi_env, value: double, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!

  HEAP32[result >> 2] = envObject.getCurrentScope().add(value).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  if (!((length === -1) || (length <= 2147483647))) {
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  }
  const envObject = emnapi.envStore.get(env)!
  const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
  HEAP32[result >> 2] = envObject.getCurrentScope().add(utf8String).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  HEAP32[result >> 2] = envObject.getCurrentScope().add({}).id
  return emnapi.napi_clear_last_error(env)
}

function napi_get_undefined (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  HEAP32[result >> 2] = emnapi.HandleStore.ID_UNDEFINED
  return emnapi.napi_clear_last_error(env)
}

function napi_get_null (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  HEAP32[result >> 2] = emnapi.HandleStore.ID_NULL
  return emnapi.napi_clear_last_error(env)
}

function napi_get_boolean (env: napi_env, value: bool, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (value === 0) {
    HEAP32[result >> 2] = emnapi.HandleStore.ID_FALSE
  } else {
    HEAP32[result >> 2] = emnapi.HandleStore.ID_TRUE
  }
  return emnapi.napi_clear_last_error(env)
}

function napi_get_global (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  HEAP32[result >> 2] = emnapi.HandleStore.ID_GLOBAL
  return emnapi.napi_clear_last_error(env)
}

function napi_get_value_bool (env: napi_env, value: napi_value, result: Pointer<bool>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (value === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  try {
    const handle = envObject.handleStore.get(value)!
    if (typeof handle.value !== 'boolean') {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_boolean_expected)
    }
    HEAPU8[result] = handle.value ? 1 : 0
  } catch (err) {
    envObject.tryCatch.setError(err)
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  }
  return emnapi.napi_clear_last_error(env)
}

function napi_get_value_uint32 (env: napi_env, value: napi_value, result: Pointer<uint32_t>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (value === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  try {
    const handle = envObject.handleStore.get(value)!
    if (typeof handle.value !== 'number') {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
    }
    HEAPU32[result >> 2] = handle.value
  } catch (err) {
    envObject.tryCatch.setError(err)
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  }
  return emnapi.napi_clear_last_error(env)
}

function napi_get_value_int64 (env: napi_env, value: napi_value, result: Pointer<int64_t>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (value === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  try {
    const handle = envObject.handleStore.get(value)!
    if (typeof handle.value !== 'number') {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
    }
    const numberValue = handle.value
    if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
      HEAP32[result >> 2] = 0
      HEAP32[result + 4 >> 2] = 0
    } else if (numberValue < emnapi.INT64_RANGE_NEGATIVE) {
      HEAP32[result >> 2] = 0
      HEAP32[result + 4 >> 2] = 0x80000000
    } else if (numberValue >= emnapi.INT64_RANGE_POSITIVE) {
      HEAPU32[result >> 2] = 0xffffffff
      HEAPU32[result + 4 >> 2] = 0x7fffffff
    } else {
      let tempDouble
      const tempI64 = [numberValue >>> 0, (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)]
      HEAP32[result >> 2] = tempI64[0]
      HEAP32[result + 4 >> 2] = tempI64[1]
    }
  } catch (err) {
    envObject.tryCatch.setError(err)
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  }
  return emnapi.napi_clear_last_error(env)
}

function napi_get_value_double (env: napi_env, value: napi_value, result: Pointer<double>): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  if (value === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const envObject = emnapi.envStore.get(env)!
  try {
    const handle = envObject.handleStore.get(value)!
    if (typeof handle.value !== 'number') {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_number_expected)
    }
    HEAPF64[result >> 3] = handle.value
  } catch (err) {
    envObject.tryCatch.setError(err)
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  }
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_int64', napi_create_int64)
emnapiImplement('napi_create_uint32', napi_create_uint32)
emnapiImplement('napi_create_double', napi_create_double)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
emnapiImplement('napi_create_object', napi_create_object)
emnapiImplement('napi_get_undefined', napi_get_undefined)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_boolean', napi_get_boolean)
emnapiImplement('napi_get_global', napi_get_global)

emnapiImplement('napi_get_value_bool', napi_get_value_bool)
emnapiImplement('napi_get_value_int64', napi_get_value_int64)
emnapiImplement('napi_get_value_uint32', napi_get_value_uint32)
emnapiImplement('napi_get_value_double', napi_get_value_double)
