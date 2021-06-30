// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  let registered = false
  let emnapiExports: any
  let _napi_register_wasm_v1: ((env: napi_env, exports: napi_value, key: Pointer<const_char_p>) => napi_value) | undefined
  let pKey: number
  function moduleRegister (): any {
    if (registered) return emnapiExports
    registered = true
    let env: Env | undefined
    pKey = call_malloc(4)
    try {
      env = Env.create()
      emnapiExports = env.callIntoModule((envObject, scope) => {
        const exports = {}
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1!(envObject.id, exportsHandle.id, pKey)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
      return emnapiExports
    } catch (err) {
      _free(pKey)
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
    _free(pKey)
    Module[key] = exports
    if (typeof Module.onEmnapiInitialized === 'function') {
      Module.onEmnapiInitialized(null, exports)
    }
  })
}
