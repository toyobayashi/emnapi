function _emnapi_create_memory_view (
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
    if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)')
    }

    let viewDescriptor: MemoryViewDescriptor
    switch (typedarray_type) {
      case emnapi_memory_view_type.emnapi_int8_array:
        viewDescriptor = { Ctor: Int8Array, address: external_data, length: byte_length, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint8_array:
        viewDescriptor = { Ctor: Uint8Array, address: external_data, length: byte_length, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint8_clamped_array:
        viewDescriptor = { Ctor: Uint8ClampedArray, address: external_data, length: byte_length, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_int16_array:
        viewDescriptor = { Ctor: Int16Array, address: external_data, length: byte_length >> 1, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint16_array:
        viewDescriptor = { Ctor: Uint16Array, address: external_data, length: byte_length >> 1, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_int32_array:
        viewDescriptor = { Ctor: Int32Array, address: external_data, length: byte_length >> 2, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint32_array:
        viewDescriptor = { Ctor: Uint32Array, address: external_data, length: byte_length >> 2, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_float32_array:
        viewDescriptor = { Ctor: Float32Array, address: external_data, length: byte_length >> 2, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_float64_array:
        viewDescriptor = { Ctor: Float64Array, address: external_data, length: byte_length >> 3, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_bigint64_array:
        viewDescriptor = { Ctor: BigInt64Array, address: external_data, length: byte_length >> 3, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_biguint64_array:
        viewDescriptor = { Ctor: BigUint64Array, address: external_data, length: byte_length >> 3, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_data_view:
        viewDescriptor = { Ctor: DataView, address: external_data, length: byte_length, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_buffer:
        viewDescriptor = { Ctor: emnapiCtx.feature.Buffer!, address: external_data, length: byte_length, ownership: Ownership.kUserland, runtimeAllocated: 0 }
        break
      default: return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const Ctor = viewDescriptor.Ctor
    const typedArray = typedarray_type === emnapi_memory_view_type.emnapi_buffer
      ? emnapiCtx.feature.Buffer!.from(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
      : new Ctor(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
    const handle = emnapiCtx.addToCurrentScope(typedArray)
    emnapiExternalMemory.wasmMemoryViewTable.set(typedArray, viewDescriptor)
    if (finalize_cb) {
      const status = _napi_add_finalizer(env, handle.id, external_data, finalize_cb, finalize_hint, /* NULL */ 0)
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
  return emnapiCtx.feature.supportFinalizer ? 1 : 0
}

function emnapi_is_support_bigint (): int {
  return emnapiCtx.feature.supportBigInt ? 1 : 0
}

function emnapi_is_node_binding_available (): int {
  return emnapiNodeBinding ? 1 : 0
}

function emnapiSyncMemory<T extends ArrayBuffer | ArrayBufferView> (
  js_to_wasm: boolean,
  arrayBufferOrView: T,
  offset?: number,
  len?: int
): T {
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

    const wasmMemoryU8 = new Uint8Array(wasmMemory.buffer)
    if (!js_to_wasm) {
      view.set(wasmMemoryU8.subarray(pointer, pointer + len))
    } else {
      wasmMemoryU8.set(view, pointer)
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

    const wasmMemoryU8 = new Uint8Array(wasmMemory.buffer)
    if (!js_to_wasm) {
      view.set(wasmMemoryU8.subarray(pointer, pointer + len))
    } else {
      wasmMemoryU8.set(view, pointer)
    }

    return latestView
  }
  throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter')
}

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

    const handle: Handle<ArrayBuffer | ArrayBufferView> = envObject.ctx.handleStore.get(handleId)!
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

function emnapiGetMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): PointerInfo {
  const isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer
  const isDataView = arrayBufferOrView instanceof DataView
  const isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView
  if (!isArrayBuffer && !isTypedArray && !isDataView) {
    throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter')
  }

  let info: PointerInfo
  if (isArrayBuffer) {
    info = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView as ArrayBuffer, false)
  } else {
    info = emnapiExternalMemory.getViewPointer(arrayBufferOrView as ArrayBufferView, false)
  }
  return {
    address: info.address,
    ownership: info.ownership,
    runtimeAllocated: info.runtimeAllocated
  }
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

    const handle: Handle<ArrayBuffer | ArrayBufferView> = envObject.ctx.handleStore.get(arraybuffer_or_view)!
    info = emnapiGetMemoryAddress(handle.value)

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

emnapiImplementHelper('$emnapiSyncMemory', undefined, emnapiSyncMemory, ['$emnapiExternalMemory'])
emnapiImplementHelper('$emnapiGetMemoryAddress', undefined, emnapiGetMemoryAddress, ['$emnapiExternalMemory'])

emnapiImplement2('emnapi_is_support_weakref', 'i', emnapi_is_support_weakref)
emnapiImplement2('emnapi_is_support_bigint', 'i', emnapi_is_support_bigint)
emnapiImplement2('emnapi_is_node_binding_available', 'i', emnapi_is_node_binding_available)

emnapiImplement2('emnapi_create_memory_view', 'ipippppp', _emnapi_create_memory_view, ['napi_add_finalizer', '$emnapiExternalMemory'])
emnapiImplement2('emnapi_sync_memory', 'ipppppi', emnapi_sync_memory, ['$emnapiSyncMemory'])
emnapiImplement2('emnapi_get_memory_address', 'ipppp', emnapi_get_memory_address, ['$emnapiGetMemoryAddress'])
