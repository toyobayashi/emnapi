function emnapi_get_module_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      HEAP32[result >> 2] = envObject.ensureHandleId(Module)
      return envObject.getReturnStatus()
    })
  })
}

function emnapi_get_module_property (env: napi_env, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [utf8name, result], () => {
      HEAP32[result >> 2] = envObject.ensureHandleId(Module[UTF8ToString(utf8name)])
      return envObject.getReturnStatus()
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
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      byte_length = byte_length >>> 0
      if (external_data === NULL) {
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
      if (finalize_cb !== NULL) {
        const status = emnapiWrap(WrapType.anonymous, env, handle.id, external_data, finalize_cb, finalize_hint, NULL)
        if (status === napi_status.napi_pending_exception) {
          throw envObject.tryCatch.extractException()
        } else if (status !== napi_status.napi_ok) {
          return envObject.setLastError(status)
        }
      }
      HEAP32[result >> 2] = handle.id
      return envObject.getReturnStatus()
    })
  })
}

emnapiImplement('emnapi_get_module_object', emnapi_get_module_object)
emnapiImplement('emnapi_get_module_property', emnapi_get_module_property)
emnapiImplement('emnapi_create_external_uint8array', emnapi_create_external_uint8array, ['$emnapiWrap'])
