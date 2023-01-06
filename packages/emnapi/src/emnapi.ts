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

declare class EmnapiMemoryView {
  readonly byteOffset: number
  readonly byteLength: number

  constructor (byteOffset: number, byteLength: number)

  get buffer (): ArrayBufferLike
  get HEAP8 (): Int8Array
  get HEAPU8 (): Uint8Array
  get HEAP16 (): Int16Array
  get HEAPU16 (): Uint16Array
  get HEAP32 (): Int32Array
  get HEAPU32 (): Uint32Array
  get HEAP64 (): BigInt64Array
  get HEAPU64 (): BigUint64Array
  get HEAPF32 (): Float32Array
  get HEAPF64 (): Float64Array
  get view (): DataView
}

mergeInto(LibraryManager.library, {
  $EmnapiMemoryView__postset: 'EmnapiMemoryView();',
  $EmnapiMemoryView: function () {
    // @ts-expect-error
    // eslint-disable-next-line no-class-assign
    EmnapiMemoryView = class {
      public readonly byteOffset!: number
      public readonly byteLength!: number

      private _HEAP8!: Int8Array
      private _HEAPU8!: Uint8Array
      private _HEAP16!: Int16Array
      private _HEAPU16!: Uint16Array
      private _HEAP32!: Int32Array
      private _HEAPU32!: Uint32Array
      private _HEAP64!: BigInt64Array
      private _HEAPU64!: BigUint64Array
      private _HEAPF32!: Float32Array
      private _HEAPF64!: Float64Array
      private _view!: DataView

      constructor (byteOffset: number, byteLength: number) {
        Object.defineProperties(this, {
          byteOffset: {
            enumerable: true,
            value: byteOffset
          },
          byteLength: {
            enumerable: true,
            value: byteLength
          }
        })
      }

      public get buffer (): ArrayBufferLike { return HEAPU8.buffer }

      public get HEAP8 (): Int8Array {
        return this._HEAP8?.buffer === HEAPU8.buffer ? this._HEAP8 : (this._HEAP8 = new Int8Array(HEAPU8.buffer, this.byteOffset, this.byteLength))
      }

      public get HEAPU8 (): Uint8Array {
        return this._HEAPU8?.buffer === HEAPU8.buffer ? this._HEAPU8 : (this._HEAPU8 = new Uint8Array(HEAPU8.buffer, this.byteOffset, this.byteLength))
      }

      public get HEAP16 (): Int16Array {
        return this._HEAP16?.buffer === HEAPU8.buffer ? this._HEAP16 : (this._HEAP16 = new Int16Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 1))
      }

      public get HEAPU16 (): Uint16Array {
        return this._HEAPU16?.buffer === HEAPU8.buffer ? this._HEAPU16 : (this._HEAPU16 = new Uint16Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 1))
      }

      public get HEAP32 (): Int32Array {
        return this._HEAP32?.buffer === HEAPU8.buffer ? this._HEAP32 : (this._HEAP32 = new Int32Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 2))
      }

      public get HEAPU32 (): Uint32Array {
        return this._HEAPU32?.buffer === HEAPU8.buffer ? this._HEAPU32 : (this._HEAPU32 = new Uint32Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 2))
      }

      public get HEAP64 (): BigInt64Array {
        return this._HEAP64?.buffer === HEAPU8.buffer ? this._HEAP64 : (this._HEAP64 = new BigInt64Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 3))
      }

      public get HEAPU64 (): BigUint64Array {
        return this._HEAPU64?.buffer === HEAPU8.buffer ? this._HEAPU64 : (this._HEAPU64 = new BigUint64Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 3))
      }

      public get HEAPF32 (): Float32Array {
        return this._HEAPF32?.buffer === HEAPU8.buffer ? this._HEAPF32 : (this._HEAPF32 = new Float32Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 2))
      }

      public get HEAPF64 (): Float64Array {
        return this._HEAPF64?.buffer === HEAPU8.buffer ? this._HEAPF64 : (this._HEAPF64 = new Float64Array(HEAPU8.buffer, this.byteOffset, this.byteLength >> 3))
      }

      public get view (): DataView {
        return this._view?.buffer === HEAPU8.buffer ? this._view : (this._view = new DataView(HEAPU8.buffer, this.byteOffset, this.byteLength))
      }
    }
  }
})

function emnapi_create_memory_view (
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
      throw new emnapiRt.NotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)')
    }
    const memoryView = new EmnapiMemoryView(external_data, byte_length)
    const handle = emnapiCtx.addToCurrentScope(memoryView)
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
  $emnapiSyncMemory__deps: ['$emnapiExternalMemory'],
  $emnapiSyncMemory: function (arrayBufferOrView: ArrayBuffer | ArrayBufferView, offset?: number, pointer?: number, len?: int, js_to_wasm?: boolean) {
    if (js_to_wasm === undefined) {
      // make the usage of this function in js can omit parameters behind the first
      js_to_wasm = true
    }
    offset = offset ?? 0
    offset = offset >>> 0
    let view: Uint8Array
    if (arrayBufferOrView instanceof ArrayBuffer) {
      if (!pointer) {
        pointer = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false).address
        if (!pointer) throw new Error('Unknown ArrayBuffer address')
      }
      if (typeof len !== 'number' || len === -1) {
        len = arrayBufferOrView.byteLength - offset
      }
      len = len >>> 0
      view = new Uint8Array(arrayBufferOrView, offset, len)
    } else if (ArrayBuffer.isView(arrayBufferOrView)) {
      if (!pointer) {
        pointer = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false).address
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
emnapiImplement('emnapi_create_memory_view', 'ipppppp', emnapi_create_memory_view, ['$emnapiWrap', '$EmnapiMemoryView'])
emnapiImplement('emnapi_sync_memory', 'ipppppi', emnapi_sync_memory, ['$emnapiSyncMemory'])
emnapiImplement('emnapi_get_memory_address', 'ipppp', emnapi_get_memory_address, ['$emnapiExternalMemory'])
