function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): emnapi.napi_status {
  HEAPU32[result >> 2] = emnapi.getCurrentScope().add(value).id
  return emnapi.napi_clear_last_error(env)
}

function napi_create_string_utf8 (env: napi_env, str: const_char_p, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  const utf8String = length === -1 ? UTF8ToString(str) : UTF8ToString(str, length)
  HEAPU32[result >> 2] = emnapi.getCurrentScope().add(utf8String).id
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_int32', napi_create_int32)
emnapiImplement('napi_create_string_utf8', napi_create_string_utf8)
