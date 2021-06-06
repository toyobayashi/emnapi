function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
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
  if (result === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (value === 0) {
    HEAP32[result >> 2] = emnapi.HandleStore.ID_FALSE
  } else {
    HEAP32[result >> 2] = emnapi.HandleStore.ID_TRUE
  }
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
emnapiImplement('napi_create_object', napi_create_object)
emnapiImplement('napi_get_undefined', napi_get_undefined)
emnapiImplement('napi_get_null', napi_get_null)
emnapiImplement('napi_get_boolean', napi_get_boolean)
