import { emnapiCtx, emnapiNodeBinding } from 'emnapi:shared'
import { wasmMemory } from 'emscripten:runtime'
import { from64, makeSetValue, makeGetValue } from 'emscripten:parse-tools'
import { type MemoryViewDescriptor, type ArrayBufferPointer, emnapiExternalMemory } from './memory'
import { napi_add_finalizer } from './wrap'
import { $CHECK_ARG, $PREAMBLE, $CHECK_ENV } from './macro'

/**
 * @__sig ipippppp
 */
export function emnapi_create_memory_view (
  env: napi_env,
  typedarray_type: emnapi_memory_view_type,
  external_data: void_p,
  byte_length: size_t,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>
): napi_status {
  let value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    from64('byte_length')
    from64('external_data')
    from64('result')

    byte_length = byte_length >>> 0

    if (!external_data) {
      byte_length = 0
    }

    if (byte_length > 2147483647) {
      throw new RangeError('Cannot create a memory view larger than 2147483647 bytes')
    }
    if ((external_data as number + byte_length) > wasmMemory.buffer.byteLength) {
      throw new RangeError('Memory out of range')
    }
    if (!emnapiCtx.features.finalizer && finalize_cb) {
      throw emnapiCtx.createNotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)')
    }

    let viewDescriptor: MemoryViewDescriptor
    switch (typedarray_type) {
      case emnapi_memory_view_type.emnapi_int8_array:
        viewDescriptor = { Ctor: Int8Array, address: external_data as number, length: byte_length, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint8_array:
        viewDescriptor = { Ctor: Uint8Array, address: external_data as number, length: byte_length, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint8_clamped_array:
        viewDescriptor = { Ctor: Uint8ClampedArray, address: external_data as number, length: byte_length, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_int16_array:
        viewDescriptor = { Ctor: Int16Array, address: external_data as number, length: byte_length >> 1, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint16_array:
        viewDescriptor = { Ctor: Uint16Array, address: external_data as number, length: byte_length >> 1, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_int32_array:
        viewDescriptor = { Ctor: Int32Array, address: external_data as number, length: byte_length >> 2, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_uint32_array:
        viewDescriptor = { Ctor: Uint32Array, address: external_data as number, length: byte_length >> 2, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_float32_array:
        viewDescriptor = { Ctor: Float32Array, address: external_data as number, length: byte_length >> 2, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_float64_array:
        viewDescriptor = { Ctor: Float64Array, address: external_data as number, length: byte_length >> 3, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_bigint64_array:
        viewDescriptor = { Ctor: BigInt64Array, address: external_data as number, length: byte_length >> 3, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_biguint64_array:
        viewDescriptor = { Ctor: BigUint64Array, address: external_data as number, length: byte_length >> 3, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_data_view:
        viewDescriptor = { Ctor: DataView, address: external_data as number, length: byte_length, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      case emnapi_memory_view_type.emnapi_buffer: {
        if (!emnapiCtx.features.Buffer) {
          throw emnapiCtx.createNotSupportBufferError('emnapi_create_memory_view', '')
        }
        viewDescriptor = { Ctor: emnapiCtx.features.Buffer!, address: external_data as number, length: byte_length, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0 }
        break
      }
      default: return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const Ctor = viewDescriptor.Ctor
    const typedArray = typedarray_type === emnapi_memory_view_type.emnapi_buffer
      ? emnapiCtx.features.Buffer!.from(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
      : new Ctor(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
    value = emnapiCtx.napiValueFromJsValue(typedArray)
    emnapiExternalMemory.wasmMemoryViewTable.set(typedArray, viewDescriptor)
    if (finalize_cb) {
      const status = napi_add_finalizer(env, value, external_data, finalize_cb, finalize_hint, /* NULL */ 0)
      if (status === napi_status.napi_pending_exception) {
        const err = envObject.tryCatch.extractException()
        envObject.clearLastError()
        throw err
      } else if (status !== napi_status.napi_ok) {
        return envObject.setLastError(status)
      }
    }
    makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/**
 * @__sig i
 */
export function emnapi_is_support_weakref (): int {
  return emnapiCtx.features.finalizer ? 1 : 0
}

/**
 * @__sig i
 */
export function emnapi_is_support_bigint (): int {
  return emnapiCtx.features.BigInt ? 1 : 0
}

/**
 * @__sig i
 */
export function emnapi_is_node_binding_available (): int {
  return emnapiNodeBinding ? 1 : 0
}

export function $emnapiSyncMemory<T extends ArrayBuffer | ArrayBufferView> (
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
      view.set(wasmMemoryU8.subarray(pointer as number, pointer as number + len))
    } else {
      wasmMemoryU8.set(view, pointer as number)
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
      view.set(wasmMemoryU8.subarray(pointer as number, pointer as number + len))
    } else {
      wasmMemoryU8.set(view, pointer as number)
    }

    return latestView
  }
  throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter')
}

/**
 * @__sig ipippp
 */
export function emnapi_sync_memory (env: napi_env, js_to_wasm: bool, arraybuffer_or_view: Pointer<napi_value>, offset: size_t, len: size_t): napi_status {
  let v: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)

    from64('arraybuffer_or_view')
    from64('offset')
    from64('len')

    const handleId = makeGetValue('arraybuffer_or_view', 0, '*')

    const handle = emnapiCtx.jsValueFromNapiValue<ArrayBuffer | ArrayBufferView>(handleId)!
    const isArrayBuffer = handle instanceof ArrayBuffer
    const isDataView = handle instanceof DataView
    const isTypedArray = ArrayBuffer.isView(handle) && !isDataView
    if (!isArrayBuffer && !isTypedArray && !isDataView) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const ret = $emnapiSyncMemory(Boolean(js_to_wasm), handle, offset, len)

    if (handle !== ret) {
      from64('arraybuffer_or_view')
      v = emnapiCtx.napiValueFromJsValue(ret)
      makeSetValue('arraybuffer_or_view', 0, 'v', '*')
    }

    return envObject.getReturnStatus()
  })
}

export function $emnapiGetMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): ArrayBufferPointer {
  const isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer
  const isDataView = arrayBufferOrView instanceof DataView
  const isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView
  if (!isArrayBuffer && !isTypedArray && !isDataView) {
    throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter')
  }

  let info: ArrayBufferPointer
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

/**
 * @__sig ipppp
 */
export function emnapi_get_memory_address (env: napi_env, arraybuffer_or_view: napi_value, address: Pointer<void_pp>, ownership: Pointer<int>, runtime_allocated: Pointer<bool>): napi_status {
  let p: number, runtimeAllocated: number, ownershipOut: number
  let info: ArrayBufferPointer

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, arraybuffer_or_view)
    if (!address && !ownership && !runtime_allocated) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    const value = emnapiCtx.jsValueFromNapiValue<ArrayBuffer | ArrayBufferView>(arraybuffer_or_view)!
    info = $emnapiGetMemoryAddress(value)

    p = info.address
    if (address) {
      from64('address')
      makeSetValue('address', 0, 'p', '*')
    }
    if (ownership) {
      from64('ownership')
      ownershipOut = info.ownership
      makeSetValue('ownership', 0, 'ownershipOut', 'i32')
    }
    if (runtime_allocated) {
      from64('runtime_allocated')
      runtimeAllocated = info.runtimeAllocated
      makeSetValue('runtime_allocated', 0, 'runtimeAllocated', 'i8')
    }

    return envObject.getReturnStatus()
  })
}

/**
 * @__sig ipp
 */
export function emnapi_get_runtime_version (env: napi_env, version: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.getEnv(env)!
  $CHECK_ARG!(envObject, version)

  let runtimeVersion: string
  try {
    runtimeVersion = emnapiCtx.getRuntimeVersions().version
  } catch (_) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  const versions = runtimeVersion.split('.')
    .map((n: string) => Number(n)) as [number, number, number]

  from64('version')

  makeSetValue('version', 0, 'versions[0]', 'u32')
  makeSetValue('version', 4, 'versions[1]', 'u32')
  makeSetValue('version', 8, 'versions[2]', 'u32')

  return envObject.clearLastError()
}

// emnapiImplementHelper('$emnapiSyncMemory', undefined, emnapiSyncMemory, ['$emnapiExternalMemory'], 'syncMemory')
// emnapiImplementHelper('$emnapiGetMemoryAddress', undefined, emnapiGetMemoryAddress, ['$emnapiExternalMemory'], 'getMemoryAddress')
