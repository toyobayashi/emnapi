/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const __EMNAPI_RUNTIME_REPLACE__: string
declare const __EMNAPI_RUNTIME_INIT__: string

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare let napiExtendedErrorInfoPtr: number | undefined
declare function _napi_register_wasm_v1 (env: napi_env, exports: napi_value): napi_value
declare function __emnapi_runtime_init (...args: [number, number]): void
declare function _free (ptr: void_p): void

mergeInto(LibraryManager.library, {
  $emnapiGetDynamicCalls__deps: ['malloc'],
  $emnapiGetDynamicCalls: {
    call_vi: function (_ptr: number, a: int32_t): void {
      return makeDynCall('vi', '_ptr')(a)
    },
    call_ii: function (_ptr: number, a: int32_t): int32_t {
      return makeDynCall('ii', '_ptr')(a)
    },
    call_iii: function (_ptr: number, a: int32_t, b: int32_t): int32_t {
      return makeDynCall('iii', '_ptr')(a, b)
    },
    call_viii: function (_ptr: number, a: int32_t, b: int32_t, c: int32_t): void {
      return makeDynCall('viii', '_ptr')(a, b, c)
    },
    call_malloc: function (_source: string, _size: string | number): void_p {
      return makeMalloc('_source', '_size')
    }
  },

  $napiExtendedErrorInfoPtr: undefined,

  $emnapi: undefined,
  $emnapi__postset: __EMNAPI_RUNTIME_REPLACE__,

  $errorMessagesPtr: undefined,

  $emnapiInit__postset: 'emnapiInit();',
  $emnapiInit__deps: ['$emnapiGetDynamicCalls', '$emnapi', '$errorMessagesPtr', 'napi_register_wasm_v1', '_emnapi_runtime_init', '$napiExtendedErrorInfoPtr', 'free'],
  $emnapiInit: function () {
    let registered = false
    let emnapiExports: any
    let exportsKey: string
    let env: emnapi.Env | undefined

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

      napiExtendedErrorInfoPtr = emnapiGetDynamicCalls.call_malloc('$emnapiInit', 16)

      const lastError = {
        data: napiExtendedErrorInfoPtr,
        getErrorCode: () => HEAP32[(napiExtendedErrorInfoPtr! >> 2) + 3],
        setErrorCode: (code: napi_status) => {
          HEAP32[(napiExtendedErrorInfoPtr! >> 2) + 3] = code
        },
        setErrorMessage: (ptr: const_char_p) => {
          HEAP32[napiExtendedErrorInfoPtr! >> 2] = ptr
        },
        dispose () {
          _free(napiExtendedErrorInfoPtr!)
          napiExtendedErrorInfoPtr = NULL
        }
      }

      env = emnapi.Env.create(emnapiGetDynamicCalls, lastError)
      const scope = env.openScope(emnapi.HandleScope)
      try {
        emnapiExports = env.callIntoModule((envObject) => {
          const exports = {}
          const exportsHandle = scope.add(exports)
          const napiValue = _napi_register_wasm_v1(envObject.id, exportsHandle.id)
          return (!napiValue) ? undefined : emnapi.handleStore.get(napiValue)!.value
        })
      } catch (err) {
        env.closeScope(scope)
        registered = false
        throw err
      }
      env.closeScope(scope)
      return emnapiExports
    }

    addOnInit(function (Module) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      __EMNAPI_RUNTIME_INIT__

      delete Module._napi_register_wasm_v1
      delete Module.__emnapi_runtime_init
      delete Module.__emnapi_execute_async_work

      callInStack(() => {
        const key_pp = stackAlloc(4)
        const errormessages_pp = stackAlloc(4)
        __emnapi_runtime_init(key_pp, errormessages_pp)
        // const malloc_p = HEAP32[malloc_pp >> 2]
        // const free_p = HEAP32[free_pp >> 2]
        const key_p = HEAP32[key_pp >> 2]
        exportsKey = (key_p ? UTF8ToString(key_p) : 'emnapiExports') || 'emnapiExports'
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        errorMessagesPtr = HEAP32[errormessages_pp >> 2] || 0
      })

      // Module.emnapiModuleRegister = moduleRegister
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
})
