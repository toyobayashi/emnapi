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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const _emnapi_create_memory_view: typeof emnapi_create_memory_view
function emnapi_create_memory_view (
  env: napi_env,
  typedarray_type: emnapi_memory_view_type,
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
      throw new RangeError('Cannot create a memory view larger than 2147483647 bytes')
    }
    if ((external_data + byte_length) > HEAPU8.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiRt.supportFinalizer && finalize_cb) {
      throw new emnapiRt.NotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)')
    }

    let info: ViewInfo
    switch (typedarray_type) {
      case emnapi_memory_view_type.emnapi_int8_array:
        info = { Ctor: Int8Array, ptr: external_data, length: byte_length }
        break
      case emnapi_memory_view_type.emnapi_uint8_array:
        info = { Ctor: Uint8Array, ptr: external_data, length: byte_length }
        break
      case emnapi_memory_view_type.emnapi_uint8_clamped_array:
        info = { Ctor: Uint8ClampedArray, ptr: external_data, length: byte_length }
        break
      case emnapi_memory_view_type.emnapi_int16_array:
        info = { Ctor: Int16Array, ptr: external_data, length: byte_length >> 1 }
        break
      case emnapi_memory_view_type.emnapi_uint16_array:
        info = { Ctor: Uint16Array, ptr: external_data, length: byte_length >> 1 }
        break
      case emnapi_memory_view_type.emnapi_int32_array:
        info = { Ctor: Int32Array, ptr: external_data, length: byte_length >> 2 }
        break
      case emnapi_memory_view_type.emnapi_uint32_array:
        info = { Ctor: Uint32Array, ptr: external_data, length: byte_length >> 2 }
        break
      case emnapi_memory_view_type.emnapi_float32_array:
        info = { Ctor: Float32Array, ptr: external_data, length: byte_length >> 2 }
        break
      case emnapi_memory_view_type.emnapi_float64_array:
        info = { Ctor: Float64Array, ptr: external_data, length: byte_length >> 3 }
        break
      case emnapi_memory_view_type.emnapi_bigint64_array:
        info = { Ctor: BigInt64Array, ptr: external_data, length: byte_length >> 3 }
        break
      case emnapi_memory_view_type.emnapi_biguint64_array:
        info = { Ctor: BigUint64Array, ptr: external_data, length: byte_length >> 3 }
        break
      case emnapi_memory_view_type.emnapi_data_view:
        info = { Ctor: DataView, ptr: external_data, length: byte_length }
        break
      case emnapi_memory_view_type.emnapi_buffer:
        info = { Ctor: Buffer, ptr: external_data, length: byte_length }
        break
      default: return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const Ctor = info.Ctor
    const typedArray = typedarray_type === emnapi_memory_view_type.emnapi_buffer
      ? Buffer.from(HEAPU8.buffer, info.ptr, info.length)
      : new Ctor(HEAPU8.buffer, info.ptr, info.length)
    const handle = emnapiCtx.addToCurrentScope(typedArray)
    emnapiExternalMemory.wasmMemoryViewTable.set(typedArray, info)
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

declare function emnapiSyncMemory<T extends ArrayBuffer | ArrayBufferView> (
  js_to_wasm: boolean,
  arrayBufferOrView: T,
  offset?: number,
  len?: int,
): T

mergeInto(LibraryManager.library, {
  $emnapiSyncMemory__deps: ['$emnapiExternalMemory'],
  $emnapiSyncMemory: function<T extends ArrayBuffer | ArrayBufferView> (js_to_wasm: boolean, arrayBufferOrView: T, offset?: number, len?: int): T {
    offset = offset ?? 0
    offset = offset >>> 0
    let view: Uint8Array
    if (arrayBufferOrView instanceof ArrayBuffer) {
      const pointer = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false).address
      if (!pointer) throw new Error('Unknown ArrayBuffer address')
      if (typeof len !== 'number' || len === -1) {
        len = arrayBufferOrView.byteLength - offset
      }
      len = len >>> 0
      if (len === 0) return arrayBufferOrView
      view = new Uint8Array(arrayBufferOrView, offset, len)

      if (!js_to_wasm) {
        view.set(HEAPU8.subarray(pointer, pointer + len))
      } else {
        HEAPU8.set(view, pointer)
      }

      return arrayBufferOrView
    }

    if (ArrayBuffer.isView(arrayBufferOrView)) {
      const viewPointerInfo = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false)
      const latestView = viewPointerInfo.view
      const pointer = viewPointerInfo.address
      if (!pointer) throw new Error('Unknown ArrayBuffer address')
      if (typeof len !== 'number' || len === -1) {
        len = latestView.byteLength - offset
      }
      len = len >>> 0
      if (len === 0) return latestView
      view = new Uint8Array(latestView.buffer, latestView.byteOffset + offset, len)

      if (!js_to_wasm) {
        view.set(HEAPU8.subarray(pointer, pointer + len))
      } else {
        HEAPU8.set(view, pointer)
      }

      return latestView
    }
    throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter')
  }
})

// @ts-expect-error
function emnapi_sync_memory (env: napi_env, js_to_wasm: bool, arraybuffer_or_view: Pointer<napi_value>, offset: size_t, len: size_t): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)

    $from64('arraybuffer_or_view')
    $from64('offset')
    $from64('len')

    const handleId = $makeGetValue('arraybuffer_or_view', 0, '*')

    const handle: emnapi.Handle<ArrayBuffer | ArrayBufferView> = envObject.ctx.handleStore.get(handleId)!
    if (!handle.isArrayBuffer() && !handle.isTypedArray() && !handle.isDataView()) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const ret = emnapiSyncMemory(Boolean(js_to_wasm), handle.value, offset, len)

    if (handle.value !== ret) {
      $from64('arraybuffer_or_view')
      v = envObject.ensureHandleId(ret)
      $makeSetValue('arraybuffer_or_view', 0, 'v', '*')
    }

    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function emnapi_get_memory_address (env: napi_env, arraybuffer_or_view: napi_value, address: Pointer<void_pp>, ownership: Pointer<int>, runtime_allocated: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let p: number, runtimeAllocated: number, ownershipOut: number
  let info: PointerInfo

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)
    if (!address && !ownership && !runtime_allocated) {
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
      info = emnapiExternalMemory.getArrayBufferPointer(handle.value as ArrayBuffer, false)
    } else {
      info = emnapiExternalMemory.getViewPointer(handle.value as ArrayBufferView, false)
    }

    p = info.address
    if (address) {
      $from64('address')
      $makeSetValue('address', 0, 'p', '*')
    }
    if (ownership) {
      $from64('ownership')
      ownershipOut = info.ownership
      $makeSetValue('ownership', 0, 'ownershipOut', 'i32')
    }
    if (runtime_allocated) {
      $from64('runtime_allocated')
      runtimeAllocated = info.runtimeAllocated
      $makeSetValue('runtime_allocated', 0, 'runtimeAllocated', 'i8')
    }

    return envObject.getReturnStatus()
  })
}

emnapiImplement('emnapi_is_support_weakref', 'i', emnapi_is_support_weakref)
emnapiImplement('emnapi_is_support_bigint', 'i', emnapi_is_support_bigint)
emnapiImplement('emnapi_get_module_object', 'ipp', emnapi_get_module_object)
emnapiImplement('emnapi_get_module_property', 'ippp', emnapi_get_module_property)
emnapiImplement('emnapi_create_memory_view', 'ipippppp', emnapi_create_memory_view, ['$emnapiWrap', '$emnapiExternalMemory'])
emnapiImplement('emnapi_sync_memory', 'ipppppi', emnapi_sync_memory, ['$emnapiSyncMemory'])
emnapiImplement('emnapi_get_memory_address', 'ipppp', emnapi_get_memory_address, ['$emnapiExternalMemory'])
