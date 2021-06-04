function napi_get_last_error_info (_env: napi_env, result: Pointer<Pointer<napi_extended_error_info>>): emnapi.napi_status {
  emnapi.napiExtendedErrorInfo.error_message = emnapi.errorMessagesPtr[emnapi.napiExtendedErrorInfo.error_code]
  HEAPU32[emnapi.napiExtendedErrorInfoPtr >> 2] = emnapi.napiExtendedErrorInfo.error_message

  HEAPU32[result >> 2] = emnapi.napiExtendedErrorInfoPtr
  return emnapi.napi_status.napi_ok
}

function napi_throw (env: napi_env, error: napi_value): emnapi.napi_status {
  emnapi.tryCatch.setError(emnapi.Handle.store[error].value)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  const error: Error & { code?: string } = new Error(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  const error: TypeError & { code?: string } = new TypeError(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  const error: RangeError & { code?: string } = new RangeError(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_is_error (env: napi_env, value: napi_value, result: Pointer<boolean>): emnapi.napi_status {
  const r = emnapi.Handle.store[value].value instanceof Error
  HEAPU8[result] = r ? 1 : 0
  return emnapi.napi_clear_last_error(env)
}

function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  const error: Error & { code?: string } = new Error(emnapi.Handle.store[msg].value)
  if (code !== 0) {
    error.code = emnapi.Handle.store[code].value
  }
  HEAPU32[result >> 2] = emnapi.getCurrentScope().add(error).id
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_get_last_error_info', napi_get_last_error_info)
emnapiImplement('napi_throw', napi_throw)
emnapiImplement('napi_throw_error', napi_throw_error)
emnapiImplement('napi_throw_type_error', napi_throw_type_error)
emnapiImplement('napi_throw_range_error', napi_throw_range_error)
emnapiImplement('napi_is_error', napi_is_error)
emnapiImplement('napi_create_error', napi_create_error)
