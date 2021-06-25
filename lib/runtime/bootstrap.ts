// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  let registered = false
  let emnapiExports: any
  let _napi_register_wasm_v1: ((env: napi_env, exports: napi_value) => napi_value) | undefined
  let _emnapi_module_key: (() => const_char_p) | undefined
  function moduleRegister (): any {
    if (registered) return emnapiExports
    registered = true
    let env: Env | undefined
    try {
      env = Env.create()
      emnapiExports = env.callIntoModule((envObject, scope) => {
        const exports = {}
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1!(envObject.id, exportsHandle.id)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
      return emnapiExports
    } catch (err) {
      registered = false
      throw err
    }
  }

  addOnInit(function (Module) {
    initErrorMemory()
    _napi_register_wasm_v1 = Module._napi_register_wasm_v1
    _emnapi_module_key = Module._emnapi_module_key
    delete Module._napi_register_wasm_v1
    delete Module._emnapi_module_key
    const key = UTF8ToString(_emnapi_module_key!()) || 'emnapiExports'
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
    Module[key] = exports
    if (typeof Module.onEmnapiInitialized === 'function') {
      Module.onEmnapiInitialized(null, exports)
    }
  })
}
