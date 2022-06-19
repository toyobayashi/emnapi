// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, compilerTimeFunction: Function, deps?: string[]): void {
  mergeInto(LibraryManager.library, {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapi', '$emnapiInit']).concat(deps ?? [])
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_clear_last_error (env: napi_env): napi_status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status

mergeInto(LibraryManager.library, {
  napi_set_last_error: function (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p) {
    const envObject = emnapi.envStore.get(env)!
    return envObject.setLastError(error_code, engine_error_code, engine_reserved)
  },
  napi_set_last_error__deps: ['$emnapi'],

  napi_clear_last_error: function (env: napi_env) {
    const envObject = emnapi.envStore.get(env)!
    return envObject.clearLastError()
  },
  napi_clear_last_error__deps: ['$emnapi']
})

declare const arrayBufferMemoryMap: WeakMap<ArrayBuffer, number>
declare const typedArrayMemoryMap: WeakMap<TypedArray | DataView, number>
declare const memoryPointerDeleter: FinalizationRegistry<number>

mergeInto(LibraryManager.library, {
  $memoryPointerDeleter__deps: ['free'],
  $memoryPointerDeleter: 'typeof FinalizationRegistry === "function" ? new FinalizationRegistry(function (pointer) { _free(pointer); }) : undefined',
  $arrayBufferMemoryMap: 'new WeakMap()',
  $typedArrayMemoryMap: 'new WeakMap()',

  $getArrayBufferPointer__deps: ['$arrayBufferMemoryMap', '$memoryPointerDeleter'],
  $getArrayBufferPointer: function (arrayBuffer: ArrayBuffer): void_p {
    if ((!memoryPointerDeleter) || (arrayBuffer === HEAPU8.buffer)) {
      return NULL
    }

    let pointer: void_p
    if (arrayBufferMemoryMap.has(arrayBuffer)) {
      pointer = arrayBufferMemoryMap.get(arrayBuffer)!
      HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
      return pointer
    }

    pointer = emnapiGetDynamicCalls.call_malloc('$getArrayBufferPointer', arrayBuffer.byteLength)
    HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
    arrayBufferMemoryMap.set(arrayBuffer, pointer)
    memoryPointerDeleter.register(arrayBuffer, pointer)
    return pointer
  },

  $getViewPointer__deps: ['$typedArrayMemoryMap', '$memoryPointerDeleter'],
  $getViewPointer: function (view: TypedArray | DataView): void_p {
    if (!memoryPointerDeleter) {
      return NULL
    }
    if (view.buffer === HEAPU8.buffer) {
      return view.byteOffset
    }

    let pointer: void_p
    if (typedArrayMemoryMap.has(view)) {
      pointer = typedArrayMemoryMap.get(view)!
      HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), pointer)
      return pointer
    }

    pointer = emnapiGetDynamicCalls.call_malloc('$getViewPointer', view.byteLength)
    HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), pointer)
    typedArrayMemoryMap.set(view, pointer)
    memoryPointerDeleter.register(view, pointer)
    return pointer
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function getArrayBufferPointer (arrayBuffer: ArrayBuffer): void_p
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function getViewPointer (arrayBuffer: TypedArray | DataView): void_p
declare type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array
