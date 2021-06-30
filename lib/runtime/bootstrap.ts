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

  export let emscriptenVersionPtr: Pointer<emnapi_emscripten_version> = NULL

  function moduleRegister (): any {
    if (registered) return emnapiExports
    registered = true
    let env: Env | undefined
    if (!pKey) pKey = call_malloc(4)
    if (!emscriptenVersionPtr) emscriptenVersionPtr = call_malloc(12)
    try {
      env = Env.create()
      emnapiExports = env.callIntoModule((envObject, scope) => {
        const exports = {}
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1!(envObject.id, exportsHandle.id,
          pKey, emscriptenVersionPtr, emscriptenVersionPtr + 4, emscriptenVersionPtr + 8)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
      return emnapiExports
    } catch (err) {
      free(pKey, 4)
      pKey = NULL
      registered = false
      throw err
    }
  }

  addOnInit(function (Module) {
    _napi_register_wasm_v1 = Module._napi_register_wasm_v1
    delete Module._napi_register_wasm_v1
    Module.emnapiModuleRegister = moduleRegister
    let exports: any
    try {
      exports = moduleRegister()
    } catch (err) {
      if (typeof Module.onEmnapiInitialized === 'function') {
        Module.onEmnapiInitialized(err || new Error(String(err)))
        return
      } else {
        throw err
      }
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
