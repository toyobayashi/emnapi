function napi_typeof (env: napi_env, value: napi_value, result: Pointer<napi_valuetype>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const v = emnapiCtx.handleStore.get(value)!
      $from64('result')
      if (typeof v === 'number') {
        HEAP32[result >> 2] = napi_valuetype.napi_number
      } else if (typeof v === 'bigint') {
        HEAP32[result >> 2] = napi_valuetype.napi_bigint
      } else if (typeof v === 'string') {
        HEAP32[result >> 2] = napi_valuetype.napi_string
      } else if (typeof v === 'function') {
      // This test has to come before IsObject because IsFunction
      // implies IsObject
        HEAP32[result >> 2] = napi_valuetype.napi_function
      } else if (emnapiRt.isExternal(v)) {
      // This test has to come before IsObject because IsExternal
      // implies IsObject
        HEAP32[result >> 2] = napi_valuetype.napi_external
      } else if (emnapiRt.isObject(v)) {
        HEAP32[result >> 2] = napi_valuetype.napi_object
      } else if (typeof v === 'boolean') {
        HEAP32[result >> 2] = napi_valuetype.napi_boolean
      } else if (v === undefined) {
        HEAP32[result >> 2] = napi_valuetype.napi_undefined
      } else if (typeof v === 'symbol') {
        HEAP32[result >> 2] = napi_valuetype.napi_symbol
      } else if (v === null) {
        HEAP32[result >> 2] = napi_valuetype.napi_null
      } else {
      // Should not get here unless V8 has added some new kind of value.
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }

      return envObject.clearLastError()
    })
  })
}

function napi_coerce_to_bool (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const handle = emnapiCtx.handleStore.get(value)
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = handle ? emnapiRt.HandleStore.ID_TRUE : emnapiRt.HandleStore.ID_FALSE
      $makeSetValue('result', 0, 'v', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_number (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const handle = emnapiCtx.handleStore.get(value)!
      if (typeof handle === 'bigint') {
        throw new TypeError('Cannot convert a BigInt value to a number')
      }
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(Number(handle))
      $makeSetValue('result', 0, 'v', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_object (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const handle = emnapiCtx.handleStore.get(value)!
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = envObject.ensureHandleId(Object(handle))
      $makeSetValue('result', 0, 'v', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_coerce_to_string (env: napi_env, value: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const handle = emnapiCtx.handleStore.get(value)!
      if (typeof handle === 'symbol') {
        throw new TypeError('Cannot convert a Symbol value to a string')
      }
      $from64('result')

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const v = emnapiCtx.addToCurrentScope(String(handle))
      $makeSetValue('result', 0, 'v', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_instanceof (env: napi_env, object: napi_value, constructor: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [object, result, constructor], () => {
      $from64('result')
      HEAPU8[result] = 0
      const ctor = emnapiCtx.handleStore.get(constructor)
      if (typeof ctor !== 'function') {
        return envObject.setLastError(napi_status.napi_function_expected)
      }
      const val = emnapiCtx.handleStore.get(object) as any
      const ret = val instanceof ctor
      HEAPU8[result] = ret ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_is_array (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const h = emnapiCtx.handleStore.get(value)
      $from64('result')
      HEAPU8[result] = Array.isArray(h) ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_arraybuffer (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const h = emnapiCtx.handleStore.get(value) as any
      $from64('result')
      HEAPU8[result] = h instanceof ArrayBuffer ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_date (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const h = emnapiCtx.handleStore.get(value) as any
      $from64('result')
      HEAPU8[result] = h instanceof Date ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_error (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const val = emnapiCtx.handleStore.get(value) as any
      $from64('result')
      HEAPU8[result] = val instanceof Error ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_typedarray (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const h = emnapiCtx.handleStore.get(value)!
      $from64('result')
      HEAPU8[result] = emnapiRt.isTypedArray(h) ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_is_dataview (env: napi_env, value: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      const h = emnapiCtx.handleStore.get(value) as any
      $from64('result')
      HEAPU8[result] = h instanceof DataView ? 1 : 0
      return envObject.clearLastError()
    })
  })
}

function napi_strict_equals (env: napi_env, lhs: napi_value, rhs: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [lhs, rhs, result], () => {
      const lv = emnapiCtx.handleStore.get(lhs)
      const rv = emnapiCtx.handleStore.get(rhs)
      $from64('result')
      HEAPU8[result] = (lv === rv) ? 1 : 0
      return envObject.getReturnStatus()
    })
  })
}

function napi_detach_arraybuffer (env: napi_env, arraybuffer: napi_value): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [arraybuffer], () => {
      const value = emnapiCtx.handleStore.get(arraybuffer) as any
      if (!(value instanceof ArrayBuffer)) {
        if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
          return envObject.setLastError(napi_status.napi_detachable_arraybuffer_expected)
        }
        return envObject.setLastError(napi_status.napi_arraybuffer_expected)
      }

      try {
        const messageChannel = new MessageChannel()
        messageChannel.port1.postMessage(value, [value])
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_is_detached_arraybuffer (env: napi_env, arraybuffer: napi_value, result: Pointer<bool>): napi_status {
  return emnapiCtx.preamble(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [arraybuffer, result], () => {
      const h = emnapiCtx.handleStore.get(arraybuffer) as any
      $from64('result')
      if (h instanceof ArrayBuffer && h.byteLength === 0) {
        try {
          // eslint-disable-next-line no-new
          new Uint8Array(h)
        } catch (_) {
          HEAPU8[result] = 1
          return envObject.getReturnStatus()
        }
      }
      HEAPU8[result] = 0
      return envObject.getReturnStatus()
    })
  })
}

emnapiImplement('napi_typeof', 'ippp', napi_typeof)
emnapiImplement('napi_coerce_to_bool', 'ippp', napi_coerce_to_bool)
emnapiImplement('napi_coerce_to_number', 'ippp', napi_coerce_to_number)
emnapiImplement('napi_coerce_to_object', 'ippp', napi_coerce_to_object)
emnapiImplement('napi_coerce_to_string', 'ippp', napi_coerce_to_string)
emnapiImplement('napi_instanceof', 'ipppp', napi_instanceof)
emnapiImplement('napi_is_array', 'ippp', napi_is_array)
emnapiImplement('napi_is_arraybuffer', 'ippp', napi_is_arraybuffer)
emnapiImplement('napi_is_date', 'ippp', napi_is_date)
emnapiImplement('napi_is_error', 'ippp', napi_is_error)
emnapiImplement('napi_is_typedarray', 'ippp', napi_is_typedarray)
emnapiImplement('napi_is_dataview', 'ippp', napi_is_dataview)
emnapiImplement('napi_strict_equals', 'ipppp', napi_strict_equals)
emnapiImplement('napi_detach_arraybuffer', 'ipp', napi_detach_arraybuffer, ['napi_set_last_error'])
emnapiImplement('napi_is_detached_arraybuffer', 'ippp', napi_is_detached_arraybuffer, ['napi_set_last_error'])
