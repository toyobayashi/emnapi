import { emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG, $PREAMBLE, $GET_RETURN_STATUS } from './macro'

/** @__sig ippp */
export function napi_typeof (env: napi_env, value: napi_value, result: Pointer<napi_valuetype>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const v = emnapiCtx.jsValueFromNapiValue(value)!
  const type = typeof v
  from64('result')
  let r: napi_valuetype
  if (type === 'number') {
    r = napi_valuetype.napi_number
  } else if (type === 'bigint') {
    r = napi_valuetype.napi_bigint
  } else if (type === 'string') {
    r = napi_valuetype.napi_string
  } else if (type === 'function') {
  // This test has to come before IsObject because IsFunction
  // implies IsObject
    r = napi_valuetype.napi_function
  } else if (emnapiCtx.isExternal(v)) {
  // This test has to come before IsObject because IsExternal
  // implies IsObject
    r = napi_valuetype.napi_external
  } else if (type === 'object' && v !== null) {
    r = napi_valuetype.napi_object
  } else if (type === 'boolean') {
    r = napi_valuetype.napi_boolean
  } else if (type === 'undefined') {
    r = napi_valuetype.napi_undefined
  } else if (type === 'symbol') {
    r = napi_valuetype.napi_symbol
  } else if (v === null) {
    r = napi_valuetype.napi_null
  } else {
  // Should not get here unless V8 has added some new kind of value.
    return envObject.setLastError(napi_status.napi_invalid_arg)
  }

  makeSetValue('result', 0, 'r', 'i32')

  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_coerce_to_bool (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  let v: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    from64('result')

    v = jsValue ? Constant.TRUE : Constant.FALSE
    makeSetValue('result', 0, 'v', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_coerce_to_number (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  let v: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (typeof jsValue === 'bigint') {
      throw new TypeError('Cannot convert a BigInt value to a number')
    }
    from64('result')

    v = emnapiCtx.napiValueFromJsValue(Number(jsValue))
    makeSetValue('result', 0, 'v', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_coerce_to_object (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  let v: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (jsValue == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }
    from64('result')

    v = emnapiCtx.napiValueFromJsValue(Object(jsValue))
    makeSetValue('result', 0, 'v', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_coerce_to_string (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  let v: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, value)
    $CHECK_ARG!(envObject, result)
    const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
    if (typeof jsValue === 'symbol') {
      throw new TypeError('Cannot convert a Symbol value to a string')
    }
    from64('result')

    v = emnapiCtx.napiValueFromJsValue(String(jsValue))
    makeSetValue('result', 0, 'v', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ipppp */
export function napi_instanceof (env: napi_env, object: napi_value, constructor: napi_value, result: Pointer<bool>): napi_status {
  let r: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, object)
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, constructor)
    from64('result')
    makeSetValue('result', 0, '0', 'i8')
    const ctor = emnapiCtx.jsValueFromNapiValue(constructor)!
    if (typeof ctor !== 'function') {
      return envObject.setLastError(napi_status.napi_function_expected)
    }
    const val = emnapiCtx.jsValueFromNapiValue(object)!
    const ret = val instanceof ctor
    r = ret ? 1 : 0
    makeSetValue('result', 0, 'r', 'i8')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_is_array (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = Array.isArray(jsValue) ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_arraybuffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = h instanceof ArrayBuffer ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function node_api_is_sharedarraybuffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = (
    (typeof SharedArrayBuffer === 'function' && h instanceof SharedArrayBuffer) ||
    (Object.prototype.toString.call(h) === '[object SharedArrayBuffer]')
  )
    ? 1
    : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_date (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = h instanceof Date ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_error (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const val = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = (val instanceof Error) ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_typedarray (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = (ArrayBuffer.isView(h)) && !(h instanceof DataView) ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_buffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const Buffer = emnapiCtx.features.Buffer
  const r = (ArrayBuffer.isView(h) || (typeof Buffer === 'function' && Buffer.isBuffer(h))) ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_dataview (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)
  const h = emnapiCtx.jsValueFromNapiValue(value)!
  from64('result')

  const r = h instanceof DataView ? 1 : 0
  makeSetValue('result', 0, 'r', 'i8')
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function napi_strict_equals (env: napi_env, lhs: napi_value, rhs: napi_value, result: Pointer<bool>): napi_status {
  let r: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, lhs)
    $CHECK_ARG!(envObject, rhs)
    $CHECK_ARG!(envObject, result)
    const lv = emnapiCtx.jsValueFromNapiValue(lhs)!
    const rv = emnapiCtx.jsValueFromNapiValue(rhs)!
    from64('result')
    r = (lv === rv) ? 1 : 0
    makeSetValue('result', 0, 'r', 'i8')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ipp */
export function napi_detach_arraybuffer (env: napi_env, arraybuffer: napi_value): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, arraybuffer)
  const value = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
  if (!(value instanceof ArrayBuffer)) {
    if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
      return envObject.setLastError(napi_status.napi_detachable_arraybuffer_expected)
    }
    return envObject.setLastError(napi_status.napi_arraybuffer_expected)
  }

  try {
    const MessageChannel = emnapiCtx.features.MessageChannel
    const messageChannel = new MessageChannel!()
    messageChannel.port1.postMessage(value, [value])
  } catch (_) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_is_detached_arraybuffer (env: napi_env, arraybuffer: napi_value, result: Pointer<bool>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer)
    $CHECK_ARG!(envObject, result)
    const h = emnapiCtx.jsValueFromNapiValue(arraybuffer)!
    from64('result')
    if (h instanceof ArrayBuffer && h.byteLength === 0) {
      try {
        // eslint-disable-next-line no-new
        new Uint8Array(h as ArrayBuffer)
      } catch (_) {
        makeSetValue('result', 0, '1', 'i8')
        return $GET_RETURN_STATUS!(envObject)
      }
    }
    makeSetValue('result', 0, '0', 'i8')
    return $GET_RETURN_STATUS!(envObject)
  })
}
