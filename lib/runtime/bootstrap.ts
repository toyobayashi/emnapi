// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  let registered = false
  let emnapiExports: any
  let _napi_register_wasm_v1: (
    (env: napi_env, exports: napi_value) => napi_value) | undefined

  function callInStack<R, T extends () => R> (f: T): R {
    const stack = stackSave()
    let r: any
    try {
      r = f()
    } catch (err) {
      stackRestore(stack)
      throw err
    }
    stackRestore(stack)
    return r
  }

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
    _napi_register_wasm_v1 = Module._napi_register_wasm_v1
    delete Module._napi_register_wasm_v1
    const _emnapi_runtime_init = Module._emnapi_runtime_init
    delete Module._emnapi_runtime_init

    callInStack(() => {
      const malloc_pp = stackAlloc(4)
      const free_pp = stackAlloc(4)
      const key_pp = stackAlloc(4)
      const errormessages_pp = stackAlloc(4)
      _emnapi_runtime_init(malloc_pp, free_pp, key_pp, errormessages_pp)
      const malloc_p = HEAP32[malloc_pp >> 2]
      const free_p = HEAP32[free_pp >> 2]
      const key_p = HEAP32[key_pp >> 2]
      malloc = function (size: number) {
        return call_ii(malloc_p, size)
      }
      free = function (ptr: number) {
        return call_vi(free_p, ptr)
      }
      exportsKey = (key_p ? UTF8ToString(key_p) : 'emnapiExports') || 'emnapiExports'
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      errorMessagesPtr = HEAP32[errormessages_pp >> 2] || 0
    })

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
    Module[exportsKey] = exports
    if (typeof Module.onEmnapiInitialized === 'function') {
      Module.onEmnapiInitialized(null, exports)
    }
  })
}
