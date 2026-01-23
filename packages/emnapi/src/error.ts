import { abort } from 'emscripten:runtime'
import { emnapiCtx, emnapiNodeBinding, emnapiEnv } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $PREAMBLE, $CHECK_ARG, $CHECK_ENV_NOT_IN_GC } from './macro'
import { emnapiString } from './string'

/** @__sig ipp */
export function napi_throw (env: napi_env, error: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, error)
    envObject.lastException.resetTo(emnapiCtx.jsValueFromNapiValue(error)!)
    return envObject.clearLastError()
  })
}

/** @__sig ippp */
export function napi_throw_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    from64('code')
    from64('msg')

    const error: Error & { code?: string } = new Error(emnapiString.UTF8ToString(msg as number, -1))
    if (code) error.code = emnapiString.UTF8ToString(code as number, -1)

    envObject.lastException.resetTo(error)
    return envObject.clearLastError()
  })
}

/** @__sig ippp */
export function napi_throw_type_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    from64('code')
    from64('msg')

    const error: TypeError & { code?: string } = new TypeError(emnapiString.UTF8ToString(msg as number, -1))
    if (code) error.code = emnapiString.UTF8ToString(code as number, -1)

    envObject.lastException.resetTo(error)
    return envObject.clearLastError()
  })
}

/** @__sig ippp */
export function napi_throw_range_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    from64('code')
    from64('msg')

    const error: RangeError & { code?: string } = new RangeError(emnapiString.UTF8ToString(msg as number, -1))
    if (code) error.code = emnapiString.UTF8ToString(code as number, -1)

    envObject.lastException.resetTo(error)
    return envObject.clearLastError()
  })
}

/** @__sig ippp */
export function node_api_throw_syntax_error (env: napi_env, code: const_char_p, msg: const_char_p): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, msg)
    from64('code')
    from64('msg')

    const error: SyntaxError & { code?: string } = new SyntaxError(emnapiString.UTF8ToString(msg as number, -1))
    if (code) error.code = emnapiString.UTF8ToString(code as number, -1)

    envObject.lastException.resetTo(error)
    return envObject.clearLastError()
  })
}

/** @__sig ipp */
export function napi_is_exception_pending (env: napi_env, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  const r = !envObject.lastException.isEmpty()
  from64('result')
  makeSetValue('result', 0, 'r ? 1 : 0', 'i8')
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function napi_create_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.jsValueFromNapiValue(msg)!
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }

  const error = new Error(msgValue)
  if (code) {
    const codeValue = emnapiCtx.jsValueFromNapiValue(code)!
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }

  from64('result')

  const value = emnapiCtx.napiValueFromJsValue(error)
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function napi_create_type_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.jsValueFromNapiValue(msg)!
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new TypeError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.jsValueFromNapiValue(code)!
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }

  from64('result')

  const value = emnapiCtx.napiValueFromJsValue(error)
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function napi_create_range_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.jsValueFromNapiValue(msg)!
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new RangeError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.jsValueFromNapiValue(code)!
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }
  from64('result')

  const value = emnapiCtx.napiValueFromJsValue(error)
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function node_api_create_syntax_error (env: napi_env, code: napi_value, msg: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, msg)
  $CHECK_ARG!(envObject, result)
  const msgValue = emnapiCtx.jsValueFromNapiValue(msg)!
  if (typeof msgValue !== 'string') {
    return envObject.setLastError(napi_status.napi_string_expected)
  }
  const error = new SyntaxError(msgValue)
  if (code) {
    const codeValue = emnapiCtx.jsValueFromNapiValue(code)!
    if (typeof codeValue !== 'string') {
      return envObject.setLastError(napi_status.napi_string_expected)
    }
    (error as any).code = codeValue
  }
  from64('result')

  const value = emnapiCtx.napiValueFromJsValue(error)
  makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_get_and_clear_last_exception (env: napi_env, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  from64('result')

  if (envObject.lastException.isEmpty()) {
    makeSetValue('result', 0, '1', '*') // ID_UNDEFINED
    return envObject.clearLastError()
  } else {
    const err = envObject.lastException.deref()!
    const value = emnapiCtx.napiValueFromJsValue(err)
    makeSetValue('result', 0, 'value', '*')
    envObject.lastException.reset()
  }
  return envObject.clearLastError()
}

/** @__sig vpppp */
export function napi_fatal_error (location: const_char_p, location_len: size_t, message: const_char_p, message_len: size_t): void {
  from64('location')
  from64('location_len')
  from64('message')
  from64('message_len')

  const locationStr = emnapiString.UTF8ToString(location as number, location_len)
  const messageStr = emnapiString.UTF8ToString(message as number, message_len)
  if (emnapiNodeBinding) {
    emnapiNodeBinding.napi.fatalError(locationStr, messageStr)
  } else {
    abort('FATAL ERROR: ' + locationStr + ' ' + messageStr)
  }
}

/** @__sig ipp */
export function napi_fatal_exception (env: napi_env, err: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, err)
    const error = emnapiCtx.jsValueFromNapiValue(err)!
    try {
      (envObject as NodeEnv).triggerFatalException(error)
    } catch (_) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    return envObject.clearLastError()
  })
}
