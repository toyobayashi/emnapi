function napi_get_last_error_info (env: napi_env, result: Pointer<Pointer<napi_extended_error_info>>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      const error_code = envObject.lastError.getErrorCode()
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const messagePointer = $makeGetValue('errorMessagesPtr', 'error_code * ' + POINTER_SIZE, '*')
      envObject.lastError.setErrorMessage(messagePointer)

      if (error_code === napi_status.napi_ok) {
        envObject.clearLastError()
      }
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = envObject.lastError.data
      $makeSetValue('result', 0, 'value', '*')
      return napi_status.napi_ok
    })
  })
}

function napi_throw (env: napi_env, error: napi_value): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [error], () => {
      envObject.tryCatch.setError(emnapiCtx.handleStore.get(error)!.value)
      return envObject.clearLastError()
    })
  })
}

function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    $from64('code')
    $from64('msg')

    const error: Error & { code?: string } = new Error(UTF8ToString(msg))
    if (code) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    $from64('code')
    $from64('msg')

    const error: TypeError & { code?: string } = new TypeError(UTF8ToString(msg))
    if (code) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    $from64('code')
    $from64('msg')

    const error: RangeError & { code?: string } = new RangeError(UTF8ToString(msg))
    if (code) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function node_api_throw_syntax_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    if (!msg) return envObject.setLastError(napi_status.napi_invalid_arg)
    $from64('code')
    $from64('msg')

    const error: SyntaxError & { code?: string } = new SyntaxError(UTF8ToString(msg))
    if (code) {
      error.code = UTF8ToString(code)
    }
    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_is_exception_pending (env: napi_env, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      const r = envObject.tryCatch.hasCaught()
      $from64('result')
      HEAPU8[result] = r ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [msg, result], () => {
      const msgValue = emnapiCtx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }

      const error = new Error(msgValue)
      const status = emnapiSetErrorCode(envObject, error, code, /* NULL */ 0)
      if (status !== napi_status.napi_ok) return status
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(error).id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_type_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [msg, result], () => {
      const msgValue = emnapiCtx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new TypeError(msgValue)
      const status = emnapiSetErrorCode(envObject, error, code, /* NULL */ 0)
      if (status !== napi_status.napi_ok) return status
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(error).id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_create_range_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [msg, result], () => {
      const msgValue = emnapiCtx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new RangeError(msgValue)
      const status = emnapiSetErrorCode(envObject, error, code, /* NULL */ 0)
      if (status !== napi_status.napi_ok) return status
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(error).id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function node_api_create_syntax_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [msg, result], () => {
      const msgValue = emnapiCtx.handleStore.get(msg)!.value
      if (typeof msgValue !== 'string') {
        return envObject.setLastError(napi_status.napi_string_expected)
      }
      const error = new SyntaxError(msgValue)
      const status = emnapiSetErrorCode(envObject, error, code, /* NULL */ 0)
      if (status !== napi_status.napi_ok) return status
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = emnapiCtx.addToCurrentScope(error).id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_get_and_clear_last_exception (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      $from64('result')

      if (!envObject.tryCatch.hasCaught()) {
        $makeSetValue('result', 0, '1', '*') // ID_UNDEFINED
        return envObject.clearLastError()
      } else {
        const err = envObject.tryCatch.exception()!
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = envObject.ensureHandleId(err)
        $makeSetValue('result', 0, 'value', '*')
        envObject.tryCatch.reset()
      }
      return envObject.clearLastError()
    })
  })
}

function napi_fatal_error (location: const_char_p, location_len: size_t, message: const_char_p, message_len: size_t): void {
  $from64('location')
  $from64('location_len')
  $from64('message')
  $from64('message_len')

  abort('FATAL ERROR: ' + (location_len === -1 ? UTF8ToString(location) : UTF8ToString(location, location_len)) + ' ' + (message_len === -1 ? UTF8ToString(message) : UTF8ToString(message, message_len)))
}

emnapiImplement('napi_get_last_error_info', 'ipp', napi_get_last_error_info, ['$errorMessagesPtr'])
emnapiImplement('napi_get_and_clear_last_exception', 'ipp', napi_get_and_clear_last_exception)
emnapiImplement('napi_throw', 'ipp', napi_throw)
emnapiImplement('napi_throw_error', 'ippp', napi_throw_error)
emnapiImplement('napi_throw_type_error', 'ippp', napi_throw_type_error)
emnapiImplement('napi_throw_range_error', 'ippp', napi_throw_range_error)
emnapiImplement('node_api_throw_syntax_error', 'ippp', node_api_throw_syntax_error)
emnapiImplement('napi_create_error', 'ipppp', napi_create_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_create_type_error', 'ipppp', napi_create_type_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_create_range_error', 'ipppp', napi_create_range_error, ['$emnapiSetErrorCode'])
emnapiImplement('node_api_create_syntax_error', 'ipppp', node_api_create_syntax_error, ['$emnapiSetErrorCode'])
emnapiImplement('napi_is_exception_pending', 'ipp', napi_is_exception_pending)
emnapiImplement('napi_fatal_error', 'vpppp', napi_fatal_error)
