// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  const sym: any = {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapiCtx', '$emnapiInit']).concat(deps ?? [])
  }
  if (sig) {
    sym[name + '__sig'] = sig
  }
  mergeInto(LibraryManager.library, sym)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_clear_last_error (env: napi_env): napi_status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status

mergeInto(LibraryManager.library, {
  napi_set_last_error: function (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p) {
    const envObject = emnapiCtx.envStore.get(env)!
    return envObject.setLastError(error_code, engine_error_code, engine_reserved)
  },
  napi_set_last_error__sig: 'ipiip',
  napi_set_last_error__deps: ['$emnapiCtx'],

  napi_clear_last_error: function (env: napi_env) {
    const envObject = emnapiCtx.envStore.get(env)!
    return envObject.clearLastError()
  },
  napi_clear_last_error__sig: 'ip',
  napi_clear_last_error__deps: ['$emnapiCtx'],

  emnapi_is_support_weakref: function () {
    return emnapiRt.supportFinalizer ? 1 : 0
  },
  emnapi_is_support_weakref__sig: 'i',
  emnapi_is_support_weakref__deps: ['$emnapiCtx'],

  emnapi_is_support_bigint: function () {
    return emnapiRt.supportBigInt ? 1 : 0
  },
  emnapi_is_support_bigint__sig: 'i',
  emnapi_is_support_bigint__deps: ['$emnapiCtx']
})

declare const arrayBufferMemoryMap: WeakMap<ArrayBuffer, number>
declare const typedArrayMemoryMap: WeakMap<ArrayBufferView, number>
declare const memoryPointerDeleter: FinalizationRegistry<number>

declare function runtimeKeepalivePush (): void
declare function runtimeKeepalivePop (): void

mergeInto(LibraryManager.library, {
  $memoryPointerDeleter: 'typeof FinalizationRegistry === "function" ? new FinalizationRegistry(function (pointer) { _free(pointer); }) : undefined',
  $arrayBufferMemoryMap: 'new WeakMap()',
  $typedArrayMemoryMap: 'new WeakMap()',

  $getArrayBufferPointer__deps: ['$arrayBufferMemoryMap', '$memoryPointerDeleter'],
  $getArrayBufferPointer: function (arrayBuffer: ArrayBuffer): void_p {
    if ((!memoryPointerDeleter) || (arrayBuffer === HEAPU8.buffer)) {
      return /* NULL */ 0
    }

    let pointer: void_p
    if (arrayBufferMemoryMap.has(arrayBuffer)) {
      pointer = arrayBufferMemoryMap.get(arrayBuffer)!
      HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
      return pointer
    }

    pointer = $makeMalloc('$getArrayBufferPointer', 'arrayBuffer.byteLength')
    HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
    arrayBufferMemoryMap.set(arrayBuffer, pointer)
    memoryPointerDeleter.register(arrayBuffer, pointer)
    return pointer
  },

  $getViewPointer__deps: ['$typedArrayMemoryMap', '$memoryPointerDeleter'],
  $getViewPointer: function (view: ArrayBufferView): void_p {
    if (!memoryPointerDeleter) {
      return /* NULL */ 0
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

    pointer = $makeMalloc('$getViewPointer', 'view.byteLength')
    HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), pointer)
    typedArrayMemoryMap.set(view, pointer)
    memoryPointerDeleter.register(view, pointer)
    return pointer
  },

  _emnapi_runtime_keepalive_push__sig: 'v',
  _emnapi_runtime_keepalive_push__deps: ['$runtimeKeepalivePush'],
  _emnapi_runtime_keepalive_push: function () {
    if (typeof runtimeKeepalivePush === 'function') runtimeKeepalivePush()
  },
  _emnapi_runtime_keepalive_pop__sig: 'v',
  _emnapi_runtime_keepalive_pop__deps: ['$runtimeKeepalivePop'],
  _emnapi_runtime_keepalive_pop: function () {
    if (typeof runtimeKeepalivePop === 'function') runtimeKeepalivePop()
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function getArrayBufferPointer (arrayBuffer: ArrayBuffer): void_p
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function getViewPointer (arrayBuffer: ArrayBufferView): void_p
