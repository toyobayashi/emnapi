// @ts-expect-error
function emnapi_get_module_object (env: napi_env, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = envObject.ensureHandleId(Module)
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function emnapi_get_module_property (env: napi_env, utf8name: const_char_p, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, utf8name)
    $CHECK_ARG!(envObject, result)
    $from64('utf8name')
    $from64('result')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = envObject.ensureHandleId(Module[UTF8ToString(utf8name)])
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

function emnapi_create_external_uint8array (
  env: napi_env,
  external_data: void_p,
  byte_length: size_t,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>
// @ts-expect-error
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $from64('byte_length')
    $from64('external_data')
    $from64('result')

    byte_length = byte_length >>> 0

    if (!external_data) {
      byte_length = 0
    }

    if (byte_length > 2147483647) {
      throw new RangeError('Cannot create a Uint8Array larger than 2147483647 bytes')
    }
    if ((external_data + byte_length) > HEAPU8.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiRt.supportFinalizer && finalize_cb) {
      throw new emnapiRt.NotSupportWeakRefError('emnapi_create_external_uint8array', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const u8arr = new Uint8Array(HEAPU8.buffer, external_data, byte_length)
    const handle = emnapiCtx.addToCurrentScope(u8arr)
    if (finalize_cb) {
      const status = emnapiWrap(WrapType.anonymous, env, handle.id, external_data, finalize_cb, finalize_hint, /* NULL */ 0)
      if (status === napi_status.napi_pending_exception) {
        const err = envObject.tryCatch.extractException()
        envObject.clearLastError()
        throw err
      } else if (status !== napi_status.napi_ok) {
        return envObject.setLastError(status)
      }
    }
    value = handle.id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

function emnapi_is_support_weakref (): int {
  return emnapiRt.supportFinalizer ? 1 : 0
}

function emnapi_is_support_bigint (): int {
  return emnapiRt.supportBigInt ? 1 : 0
}

declare function emnapiSyncMemory (arrayBufferOrView: ArrayBuffer | ArrayBufferView, offset?: number, pointer?: number, len?: int, js_to_wasm?: boolean): void

mergeInto(LibraryManager.library, {
  $emnapiSyncMemory: function (arrayBufferOrView: ArrayBuffer | ArrayBufferView, offset?: number, pointer?: number, len?: int, js_to_wasm?: boolean) {
    offset = offset ?? 0
    offset = offset >>> 0
    let view: Uint8Array
    if (arrayBufferOrView instanceof ArrayBuffer) {
      if (!pointer) {
        pointer = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false)
        if (!pointer) throw new Error('Unknown ArrayBuffer address')
      }
      if (typeof len !== 'number' || len === -1) {
        len = arrayBufferOrView.byteLength - offset
      }
      len = len >>> 0
      view = new Uint8Array(arrayBufferOrView, offset, len)
    } else if (ArrayBuffer.isView(arrayBufferOrView)) {
      if (!pointer) {
        pointer = emnapiExternalMemory.getViewPointer(arrayBufferOrView, arrayBufferOrView.byteOffset, false)
        if (!pointer) throw new Error('Unknown ArrayBuffer address')
      }
      if (typeof len !== 'number' || len === -1) {
        len = arrayBufferOrView.byteLength - offset
      }
      len = len >>> 0
      view = new Uint8Array(arrayBufferOrView.buffer, arrayBufferOrView.byteOffset + offset, len)
    } else {
      throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter')
    }

    if (!js_to_wasm) {
      view.set(HEAPU8.subarray(pointer, pointer + len))
    } else {
      HEAPU8.set(view, pointer)
    }
  }
})

// @ts-expect-error
function emnapi_sync_memory (env: napi_env, arraybuffer_or_view: napi_value, offset: size_t, pointer: void_p, len: size_t, js_to_wasm: bool): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)
    $CHECK_ARG!(envObject, pointer)

    $from64('offset')
    $from64('pointer')
    $from64('len')

    const handle: emnapi.Handle<ArrayBuffer | ArrayBufferView> = envObject.ctx.handleStore.get(arraybuffer_or_view)!
    if (!handle.isArrayBuffer() && !handle.isTypedArray() && !handle.isDataView()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    emnapiSyncMemory(handle.value, offset, pointer, len, Boolean(js_to_wasm))

    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function emnapi_get_buffer_address (env: napi_env, arraybuffer_or_view: napi_value, address: Pointer<void_pp>, is_copied: Pointer<bool>): napi_status {
  let p: number
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let isCopied: number
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)
    if (!address && !is_copied) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    const handle: emnapi.Handle<ArrayBuffer | ArrayBufferView> = envObject.ctx.handleStore.get(arraybuffer_or_view)!
    const isArrayBuffer = handle.isArrayBuffer()
    const isTypedArray = handle.isTypedArray()
    const isDataView = handle.isDataView()
    if (!isArrayBuffer && !isTypedArray && !isDataView) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    if (isArrayBuffer) {
      p = emnapiExternalMemory.getArrayBufferPointer(handle.value as ArrayBuffer, false)
      if (address) {
        $from64('address')
        $makeSetValue('address', 0, 'p', '*')
      }
      if (is_copied) {
        $from64('is_copied')
        isCopied = p !== 0 ? 1 : 0
        $makeSetValue('is_copied', 0, 'isCopied', 'i8')
      }
    } else {
      const value = handle.value as ArrayBufferView
      p = emnapiExternalMemory.getViewPointer(value as ArrayBufferView, value.byteOffset, false)
      if (address) {
        $from64('address')
        $makeSetValue('address', 0, 'p', '*')
      }
      if (is_copied) {
        $from64('is_copied')
        isCopied = emnapiExternalMemory.table.has(value.buffer) ? 1 : 0
        $makeSetValue('is_copied', 0, 'isCopied', 'i8')
      }
    }

    return envObject.getReturnStatus()
  })
}

emnapiImplement('emnapi_is_support_weakref', 'i', emnapi_is_support_weakref)
emnapiImplement('emnapi_is_support_bigint', 'i', emnapi_is_support_bigint)
emnapiImplement('emnapi_get_module_object', 'ipp', emnapi_get_module_object)
emnapiImplement('emnapi_get_module_property', 'ippp', emnapi_get_module_property)
emnapiImplement('emnapi_create_external_uint8array', 'ipppppp', emnapi_create_external_uint8array, ['$emnapiWrap'])
emnapiImplement('emnapi_sync_memory', 'ipppppi', emnapi_sync_memory, ['$emnapiSyncMemory'])
emnapiImplement('emnapi_get_buffer_address', 'ipppp', emnapi_get_buffer_address, ['$emnapiExternalMemory'])
