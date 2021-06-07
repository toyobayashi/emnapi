function napi_typeof (env: napi_env, value: napi_value, result: Pointer<emnapi.napi_valuetype>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [value, result], () => {
      try {
        const v = envObject.handleStore.get(value)!
        if (v.isNumber()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_number
        } else if (v.isBigInt()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_bigint
        } else if (v.isString()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_string
        } else if (v.isFunction()) {
        // This test has to come before IsObject because IsFunction
        // implies IsObject
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_function
        } else if (v.isExternal()) {
        // This test has to come before IsObject because IsExternal
        // implies IsObject
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_external
        } else if (v.isObject()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_object
        } else if (v.isBoolean()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_boolean
        } else if (v.isUndefined()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_undefined
        } else if (v.isSymbol()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_symbol
        } else if (v.isNull()) {
          HEAP32[result >> 2] = emnapi.napi_valuetype.napi_null
        } else {
        // Should not get here unless V8 has added some new kind of value.
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
        }
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }

      return emnapi.napi_clear_last_error(env)
    })
  })
}

emnapiImplement('napi_typeof', napi_typeof)
