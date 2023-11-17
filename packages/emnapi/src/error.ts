function __emnapi_get_last_error_info (env: napi_env, error_code: Pointer<napi_status>, engine_error_code: Pointer<uint32_t>, engine_reserved: void_pp): void {
  $from64('error_code')
  $from64('engine_error_code')
  $from64('engine_reserved')
  const envObject = emnapiCtx.envStore.get(env)!

  const lastError = envObject.lastError
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const errorCode = lastError.errorCode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const engineErrorCode = lastError.engineErrorCode >>> 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const engineReserved = lastError.engineReserved
  $from64('engineReserved')

  $makeSetValue('error_code', 0, 'errorCode', 'i32')
  $makeSetValue('engine_error_code', 0, 'engineErrorCode', 'u32')
  $makeSetValue('engine_reserved', 0, 'engineReserved', '*')
}

function napi_throw (env: napi_env, error: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, error)
    envObject.tryCatch.setError(emnapiCtx.handleStore.get(error)!.value)
    return envObject.clearLastError()
  })
}

function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    $from64('code')
    $from64('msg')

    const error: Error & { code?: string } = new Error(emnapiString.UTF8ToString(msg, -1))
    if (code) error.code = emnapiString.UTF8ToString(code, -1)

    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    $from64('code')
    $from64('msg')

    const error: TypeError & { code?: string } = new TypeError(emnapiString.UTF8ToString(msg, -1))
    if (code) error.code = emnapiString.UTF8ToString(code, -1)

    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    $from64('code')
    $from64('msg')

    const error: RangeError & { code?: string } = new RangeError(emnapiString.UTF8ToString(msg, -1))
    if (code) error.code = emnapiString.UTF8ToString(code, -1)

    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function node_api_throw_syntax_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    $from64('code')
    $from64('msg')

    const error: SyntaxError & { code?: string } = new SyntaxError(emnapiString.UTF8ToString(msg, -1))
    if (code) error.code = emnapiString.UTF8ToString(code, -1)

    envObject.tryCatch.setError(error)
    return envObject.clearLastError()
  })
}

function napi_is_exception_pending (env: napi_env, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const r = envObject.tryCatch.hasCaught()
  $from64('result')
  $makeSetValue('result', 0, 'r ? 1 : 0', 'i8')
  return envObject.clearLastError()
}

function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.handleStore.get(msg)!.value
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }

  const error = new Error(msgValue)
  if (code) {
    const codeValue = emnapiCtx.handleStore.get(code)!.value
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }

  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(error).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_type_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.handleStore.get(msg)!.value
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new TypeError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.handleStore.get(code)!.value
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }

  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(error).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_create_range_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.handleStore.get(msg)!.value
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new RangeError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.handleStore.get(code)!.value
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }
  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(error).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function node_api_create_syntax_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.handleStore.get(msg)!.value
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new SyntaxError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.handleStore.get(code)!.value
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }
  $from64('result')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = emnapiCtx.addToCurrentScope(error).id
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

function napi_get_and_clear_last_exception (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  $from64('result')

  if (!envObject.tryCatch.hasCaught()) {
    $makeSetValue('result', 0, '1', '*') // ID_UNDEFINED
    return envObject.clearLastError()
  } else {
    const err = envObject.tryCatch.exception()!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const value = envObject.ensureHandleId(err)
    $makeSetValue('result', 0, 'value', '*')
    envObject.tryCatch.reset()
  }
  return envObject.clearLastError()
}

function napi_fatal_error (location: const_char_p, location_len: size_t, message: const_char_p, message_len: size_t): void {
  $from64('location')
  $from64('location_len')
  $from64('message')
  $from64('message_len')

  const locationStr = emnapiString.UTF8ToString(location, location_len)
  const messageStr = emnapiString.UTF8ToString(message, message_len)
  if (emnapiNodeBinding) {
    emnapiNodeBinding.napi.fatalError(locationStr, messageStr)
  } else {
    abort('FATAL ERROR: ' + locationStr + ' ' + messageStr)
  }
}

function napi_fatal_exception (env: napi_env, err: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, err)
    const error = envObject.ctx.handleStore.get(err)!
    try {
      (envObject as NodeEnv).triggerFatalException(error.value)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    return envObject.clearLastError()
  })
}

emnapiImplementInternal('_emnapi_get_last_error_info', 'vpppp', __emnapi_get_last_error_info)

emnapiImplement('napi_get_and_clear_last_exception', 'ipp', napi_get_and_clear_last_exception)
emnapiImplement('napi_throw', 'ipp', napi_throw)
emnapiImplement('napi_throw_error', 'ippp', napi_throw_error, ['$emnapiString'])
emnapiImplement('napi_throw_type_error', 'ippp', napi_throw_type_error, ['$emnapiString'])
emnapiImplement('napi_throw_range_error', 'ippp', napi_throw_range_error, ['$emnapiString'])
emnapiImplement('node_api_throw_syntax_error', 'ippp', node_api_throw_syntax_error, ['$emnapiString'])
emnapiImplement('napi_create_error', 'ipppp', napi_create_error, ['$emnapiString'])
emnapiImplement('napi_create_type_error', 'ipppp', napi_create_type_error, ['$emnapiString'])
emnapiImplement('napi_create_range_error', 'ipppp', napi_create_range_error, ['$emnapiString'])
emnapiImplement('node_api_create_syntax_error', 'ipppp', node_api_create_syntax_error, ['$emnapiString'])
emnapiImplement('napi_is_exception_pending', 'ipp', napi_is_exception_pending)
emnapiImplement('napi_fatal_error', 'vpppp', napi_fatal_error, ['$emnapiString'])
emnapiImplement('napi_fatal_exception', 'ipp', napi_fatal_exception)
