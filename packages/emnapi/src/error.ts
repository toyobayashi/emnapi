function napi_get_last_error_info (env: napi_env, result: Pointer<Pointer<napi_extended_error_info>>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const error_code = envObject.lastError.errorCode
      envObject.lastError.errorMessage = HEAP32[(errorMessagesPtr! >> 2) + (error_code as number)]

      if (error_code === napi_status.napi_ok) {
        envObject.clearLastError()
      }
      HEAP32[result >> 2] = envObject.lastError.data
      return napi_status.napi_ok
    })
  })
}

function napi_throw (env: napi_env, error: napi_value): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [error], () => {
      envObject.tryCatch.setError(envObject.handleStore.get(error)!.value)
      return envObject.clearLastError()
    })
  })
}

function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (msg === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const error: Error & { code?: string } = new Error(UTF8ToString(msg))
    if (code !== NULL) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (msg === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const error: TypeError & { code?: string } = new TypeError(UTF8ToString(msg))
    if (code !== NULL) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (msg === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const error: RangeError & { code?: string } = new RangeError(UTF8ToString(msg))
    if (code !== NULL) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function node_api_throw_syntax_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (msg === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const error: SyntaxError & { code?: string } = new SyntaxError(UTF8ToString(msg))
    if (code !== NULL) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_is_exception_pending (env: napi_env, result: Pointer<bool>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const r = envObject.tryCatch.hasCaught()
      HEAPU8[result] = r ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [msg, result], () => {
      let error: Error & { code?: string }
      try {
        const msgValue = envObject.handleStore.get(msg)!.value
        if (typeof msgValue !== 'string') {
          return envObject.setLastError(napi_status.napi_string_expected)
        }

        error = new Error(msgValue)
        const status = emnapiSetErrorCode(envObject, error, code, NULL)
        if (status !== napi_status.napi_ok) return status
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(error).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_type_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [msg, result], () => {
      let error: TypeError & { code?: string }
      try {
        const msgValue = envObject.handleStore.get(msg)!.value
        if (typeof msgValue !== 'string') {
          return envObject.setLastError(napi_status.napi_string_expected)
        }
        error = new TypeError(msgValue)
        const status = emnapiSetErrorCode(envObject, error, code, NULL)
        if (status !== napi_status.napi_ok) return status
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(error).id
      return envObject.clearLastError()
    })
  })
}

function napi_create_range_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [msg, result], () => {
      let error: RangeError & { code?: string }
      try {
        const msgValue = envObject.handleStore.get(msg)!.value
        if (typeof msgValue !== 'string') {
          return envObject.setLastError(napi_status.napi_string_expected)
        }
        error = new RangeError(msgValue)
        const status = emnapiSetErrorCode(envObject, error, code, NULL)
        if (status !== napi_status.napi_ok) return status
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(error).id
      return envObject.clearLastError()
    })
  })
}

function node_api_create_syntax_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [msg, result], () => {
      let error: SyntaxError & { code?: string }
      try {
        const msgValue = envObject.handleStore.get(msg)!.value
        if (typeof msgValue !== 'string') {
          return envObject.setLastError(napi_status.napi_string_expected)
        }
        error = new SyntaxError(msgValue)
        const status = emnapiSetErrorCode(envObject, error, code, NULL)
        if (status !== napi_status.napi_ok) return status
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      HEAP32[result >> 2] = envObject.getCurrentScope().add(error).id
      return envObject.clearLastError()
    })
  })
}

function napi_get_and_clear_last_exception (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      if (!envObject.tryCatch.hasCaught()) {
        HEAP32[result >> 2] = emnapi.HandleStore.ID_UNDEFINED
        return envObject.clearLastError()
      } else {
        const err = envObject.tryCatch.exception()!
        HEAP32[result >> 2] = envObject.ensureHandleId(err)
        envObject.tryCatch.reset()
      }
      return envObject.clearLastError()
    })
  })
}

function napi_fatal_error (location: const_char_p, location_len: size_t, message: const_char_p, message_len: size_t): void {
  abort('FATAL ERROR: ' + (location_len === -1 ? UTF8ToString(location) : UTF8ToString(location, location_len)) + ' ' + (message_len === -1 ? UTF8ToString(message) : UTF8ToString(message, message_len)))
}

emnapiImplement('napi_get_last_error_info', napi_get_last_error_info, ['$errorMessagesPtr'])
emnapiImplement('napi_get_and_clear_last_exception', napi_get_and_clear_last_exception)
emnapiImplement('napi_throw', napi_throw)
emnapiImplement('napi_throw_error', napi_throw_error)
emnapiImplement('napi_throw_type_error', napi_throw_type_error)
emnapiImplement('napi_throw_range_error', napi_throw_range_error)
emnapiImplement('node_api_throw_syntax_error', node_api_throw_syntax_error)
emnapiImplement('napi_create_error', napi_create_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_create_type_error', napi_create_type_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_create_range_error', napi_create_range_error, ['$emnapiSetErrorCode'])
emnapiImplement('node_api_create_syntax_error', node_api_create_syntax_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_is_exception_pending', napi_is_exception_pending)
emnapiImplement('napi_fatal_error', napi_fatal_error)
