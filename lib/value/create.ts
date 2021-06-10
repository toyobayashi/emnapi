function napi_create_array (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add([]).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_array_with_length (env: napi_env, length: size_t, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new Array(length >>> 0)).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_arraybuffer (env: napi_env, _byte_length: size_t, _data: void_pp, _result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  // TODO
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

function napi_create_date (env: napi_env, time: double, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add(new Date(time)).id
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_create_external (env: napi_env, data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_value>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const externalHandle = emnapi.ExternalHandle.createExternal(env, data)
      envObject.getCurrentScope().addNoCopy(externalHandle)
      emnapi.Reference.create(env, externalHandle.id, 0, true, finalize_cb, data, finalize_hint)
      HEAP32[result >> 2] = externalHandle.id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_external_arraybuffer (
  env: napi_env,
  _external_data: void_p,
  _byte_length: size_t,
  _finalize_cb: napi_finalize,
  _finalize_hint: void_p,
  _result: Pointer<napi_value>
): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  // TODO
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

function napi_create_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.getCurrentScope().add({}).id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_symbol (env: napi_env, description: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      if (description === emnapi.NULL) {
        // eslint-disable-next-line symbol-description
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol()).id
      } else {
        const handle = envObject.handleStore.get(description)!
        const desc = handle.value
        if (typeof desc !== 'string') {
          return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_string_expected)
        }
        HEAP32[result >> 2] = envObject.getCurrentScope().add(Symbol(desc)).id
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_create_typedarray (
  env: napi_env,
  _type: emnapi.napi_typedarray_type,
  _length: size_t,
  _arraybuffer: napi_value,
  _byte_offset: size_t,
  _result: Pointer<napi_value>
): emnapi.napi_status {
  // TODO
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

function napi_create_dataview (
  env: napi_env,
  _length: size_t,
  _arraybuffer: napi_value,
  _byte_offset: size_t,
  _result: Pointer<napi_value>
): emnapi.napi_status {
  // TODO
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

emnapiImplement('napi_create_array', napi_create_array)
emnapiImplement('napi_create_array_with_length', napi_create_array_with_length)
emnapiImplement('napi_create_arraybuffer', napi_create_arraybuffer)
emnapiImplement('napi_create_date', napi_create_date)
emnapiImplement('napi_create_external', napi_create_external)
emnapiImplement('napi_create_external_arraybuffer', napi_create_external_arraybuffer)
emnapiImplement('napi_create_object', napi_create_object)
emnapiImplement('napi_create_symbol', napi_create_symbol)
emnapiImplement('napi_create_typedarray', napi_create_typedarray)
emnapiImplement('napi_create_dataview', napi_create_dataview)
