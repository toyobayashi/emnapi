// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  let registered = false
  let emnapiExports: any
  let _napi_register_wasm_v1: (
    (env: napi_env, exports: napi_value,
      key: Pointer<const_char_p>,
      version_major: Pointer<int>,
      version_minor: Pointer<int>,
      version_patch: Pointer<int>
    ) => napi_value) | undefined
  let pKey: Pointer<const_char_p> = NULL

  export let emscriptenVersionPtr: number = NULL // Pointer<emnapi_emscripten_version>
  export let emscriptenVersion: emnapi_emscripten_version | null = null

  function moduleRegister (): any {
    if (registered) return emnapiExports
    registered = true
    let env: Env | undefined
    try {
      env = Env.create()
      emnapiExports = env.callIntoModule((envObject, scope) => {
        const exports = {}
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1!(envObject.id, exportsHandle.id,
          pKey,
          emscriptenVersionPtr,
          emscriptenVersionPtr ? emscriptenVersionPtr + 4 : NULL,
          emscriptenVersionPtr ? emscriptenVersionPtr + 8 : NULL)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
      return emnapiExports
    } catch (err) {
      registered = false
      throw err
    }
  }

  addOnInit(function (Module) {
    _napi_register_wasm_v1 = Module._napi_register_wasm_v1
    delete Module._napi_register_wasm_v1
    Module.emnapiModuleRegister = moduleRegister
    if (!pKey) pKey = call_malloc(4)
    if (!emscriptenVersionPtr) emscriptenVersionPtr = call_malloc(12)
    let exports: any
    try {
      exports = moduleRegister()
    } catch (err) {
      free(pKey, 4)
      pKey = NULL
      free(emscriptenVersionPtr, 12)
      emscriptenVersionPtr = NULL
      if (typeof Module.onEmnapiInitialized === 'function') {
        Module.onEmnapiInitialized(err || new Error(String(err)))
        return
      } else {
        throw err
      }
    }
    if (emscriptenVersionPtr) {
      emscriptenVersion = {
        major: HEAPU32[emscriptenVersionPtr >> 2],
        minor: HEAPU32[(emscriptenVersionPtr >> 2) + 1],
        patch: HEAPU32[(emscriptenVersionPtr >> 2) + 2]
      }
      free(emscriptenVersionPtr, 12)
      emscriptenVersionPtr = NULL
    }
    const key = UTF8ToString(HEAP32[pKey >> 2]) || 'emnapiExports'
    free(pKey, 4)
    pKey = NULL
    Module[key] = exports
    if (typeof Module.onEmnapiInitialized === 'function') {
      Module.onEmnapiInitialized(null, exports)
    }
  })
}
