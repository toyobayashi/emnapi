function emnapi_get_module_object (env: napi_env, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      HEAP32[result >> 2] = envObject.ensureHandleId(Module)
      return emnapi.getReturnStatus(env)
    })
  })
}

function emnapi_get_module_property (env: napi_env, utf8name: const_char_p, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [utf8name, result], () => {
      HEAP32[result >> 2] = envObject.ensureHandleId(Module[UTF8ToString(utf8name)])
      return emnapi.getReturnStatus(env)
    })
  })
}

function emnapi_create_external_uint8array (
  env: napi_env,
  external_data: void_p,
  byte_length: size_t,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>
): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      byte_length = byte_length >>> 0
      if (external_data === emnapi.NULL) {
        byte_length = 0
      }

      if (byte_length > 2147483647) {
        throw new RangeError('Cannot create a Uint8Array larger than 2147483647 bytes')
      }
      if ((external_data + byte_length) > HEAPU8.buffer.byteLength) {
        throw new RangeError('Memory out of range')
      }
      const u8arr = new Uint8Array(HEAPU8.buffer, external_data, byte_length)
      const handle = envObject.getCurrentScope().add(u8arr)
      if (finalize_cb !== emnapi.NULL) {
        const status = emnapi.wrap(emnapi.WrapType.anonymous, env, handle.id, external_data, finalize_cb, finalize_hint, emnapi.NULL)
        if (status === emnapi.napi_status.napi_pending_exception) {
          throw envObject.tryCatch.extractException()
        } else if (status !== emnapi.napi_status.napi_ok) {
          return emnapi.napi_set_last_error(env, status)
        }
      }
      HEAP32[result >> 2] = handle.id
      return emnapi.getReturnStatus(env)
    })
  })
}

emnapiImplement('emnapi_get_module_object', emnapi_get_module_object)
emnapiImplement('emnapi_get_module_property', emnapi_get_module_property)
emnapiImplement('emnapi_create_external_uint8array', emnapi_create_external_uint8array)
