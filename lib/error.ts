function napi_get_last_error_info (env: napi_env, result: Pointer<Pointer<napi_extended_error_info>>): emnapi.napi_status {
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  emnapi.napiExtendedErrorInfo.error_message = emnapi.errorMessagesPtr[emnapi.napiExtendedErrorInfo.error_code]
  HEAP32[emnapi.napiExtendedErrorInfoPtr >> 2] = emnapi.napiExtendedErrorInfo.error_message

  HEAP32[result >> 2] = emnapi.napiExtendedErrorInfoPtr
  return emnapi.napi_status.napi_ok
}

function napi_throw (env: napi_env, error: napi_value): emnapi.napi_status {
  if (emnapi.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (error === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  emnapi.tryCatch.setError(emnapi.Handle.store[error].value)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  if (emnapi.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (msg === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const error: Error & { code?: string } = new Error(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  if (emnapi.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (msg === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const error: TypeError & { code?: string } = new TypeError(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): emnapi.napi_status {
  if (emnapi.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (msg === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const error: RangeError & { code?: string } = new RangeError(UTF8ToString(msg))
  if (code !== 0) {
    error.code = UTF8ToString(code)
  }
  emnapi.tryCatch.setError(error)
  return emnapi.napi_clear_last_error(env)
}

function napi_is_error (env: napi_env, value: napi_value, result: Pointer<boolean>): emnapi.napi_status {
  if (value === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const r = emnapi.Handle.store[value].value instanceof Error
  HEAPU8[result] = r ? 1 : 0
  return emnapi.napi_clear_last_error(env)
}

function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  if (msg === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const msgValue = emnapi.Handle.store[msg].value
  if (typeof msgValue !== 'string') {
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
  }

  const error: Error & { code?: string } = new Error(msgValue)
  if (code !== 0) {
    error.code = emnapi.Handle.store[code].value
  }
  HEAP32[result >> 2] = emnapi.getCurrentScope().add(error).id
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_get_last_error_info', napi_get_last_error_info)
emnapiImplement('napi_throw', napi_throw)
emnapiImplement('napi_throw_error', napi_throw_error)
emnapiImplement('napi_throw_type_error', napi_throw_type_error)
emnapiImplement('napi_throw_range_error', napi_throw_range_error)
emnapiImplement('napi_is_error', napi_is_error)
emnapiImplement('napi_create_error', napi_create_error)
