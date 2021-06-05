function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  HEAPU32[result >> 2] = emnapi.getCurrentScope().add(value).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  if (!((length === -1) || (length <= 2147483647))) {
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  }
  const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
  HEAPU32[result >> 2] = emnapi.getCurrentScope().add(utf8String).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  HEAPU32[result >> 2] = emnapi.getCurrentScope().add({}).id
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
emnapiImplement('napi_create_object', napi_create_object)
