/* eslint-disable no-unreachable */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const __EMNAPI_RUNTIME_REPLACE__: string
declare const __EMNAPI_RUNTIME_INIT__: string

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare let napiExtendedErrorInfoPtr: number | undefined
declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value
declare function __emnapi_runtime_init (...args: [Ptr, Ptr]): void
declare function _free (ptr: Ptr): void

mergeInto(LibraryManager.library, {
  $emnapiGetDynamicCalls__deps: ['malloc'],
  $emnapiGetDynamicCalls: {
    call_vp: function (_ptr: Ptr, a: Ptr): void {
      return $makeDynCall('vp', '_ptr')(a)
    },
    call_vpp (_ptr: Ptr, a: Ptr, b: Ptr): void {
      return $makeDynCall('vpp', '_ptr')(a, b)
    },
    call_ppp: function (_ptr: Ptr, a: Ptr, b: Ptr): int32_t {
      return $makeDynCall('ppp', '_ptr')(a, b)
    },
    call_vpip: function (_ptr: Ptr, a: Ptr, b: number, c: Ptr): void {
      return $makeDynCall('vpip', '_ptr')(a, b, c)
    },
    call_vppp: function (_ptr: Ptr, a: Ptr, b: Ptr, c: Ptr): void {
      return $makeDynCall('vppp', '_ptr')(a, b, c)
    },
    call_vpppp: function (_ptr: Ptr, a: Ptr, b: Ptr, c: Ptr, d: Ptr): void {
      return $makeDynCall('vpppp', '_ptr')(a, b, c, d)
    }
  },

  $napiExtendedErrorInfoPtr: undefined,

  $emnapi: undefined,
  $emnapi__postset: __EMNAPI_RUNTIME_REPLACE__,

  $errorMessagesPtr: undefined,

  $emnapiInit__postset: 'emnapiInit();',
  $emnapiInit__deps: [
    '$emnapiGetDynamicCalls',
    '$emnapi',
    '$errorMessagesPtr',
    'napi_register_wasm_v1',
    '_emnapi_runtime_init',
    '$napiExtendedErrorInfoPtr',
    'free'
  ],
  $emnapiInit: function () {
    let registered = false
    let emnapiExports: any
    let exportsKey: string
    let env: emnapi.Env | undefined

    function callInStack<T extends () => any> (f: T): ReturnType<T> {
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

      // #if MEMORY64
      napiExtendedErrorInfoPtr = $makeMalloc('$emnapiInit', 24)
      // #else
      napiExtendedErrorInfoPtr = $makeMalloc('$emnapiInit', 16)
      // #endif

      const lastError = {
        data: napiExtendedErrorInfoPtr,
        getErrorCode: () => {
          // #if MEMORY64
          return HEAP32[(napiExtendedErrorInfoPtr! + 20) >> 2]
          // #else
          return HEAP32[(napiExtendedErrorInfoPtr! + 12) >> 2]
          // #endif
        },
        setErrorCode: (code: napi_status) => {
          // #if MEMORY64
          HEAP32[(napiExtendedErrorInfoPtr! + 20) >> 2] = code
          // #else
          HEAP32[(napiExtendedErrorInfoPtr! + 12) >> 2] = code
          // #endif
        },
        setErrorMessage: (_ptr: const_char_p) => {
          makeSetValue('napiExtendedErrorInfoPtr', 0, '_ptr', '*')
        },
        dispose () {
          // #if MEMORY64
          _free(BigInt(napiExtendedErrorInfoPtr!))
          // #else
          _free(napiExtendedErrorInfoPtr!)
          // #endif
          napiExtendedErrorInfoPtr = 0
        }
      }

      env = emnapi.Env.create(emnapiGetDynamicCalls, lastError)
      const scope = emnapi.openScope(env, emnapi.HandleScope)
      try {
        emnapiExports = env.callIntoModule((envObject) => {
          const exports = {}
          const exportsHandle = scope.add(envObject, exports)
          let napiValue: number
          // #if MEMORY64
          napiValue = Number(_napi_register_wasm_v1(BigInt(envObject.id), BigInt(exportsHandle.id)))
          // #else
          napiValue = _napi_register_wasm_v1(envObject.id, exportsHandle.id)
          // #endif
          return (!napiValue) ? exports : emnapi.handleStore.get(napiValue)!.value
        })
      } catch (err) {
        emnapi.closeScope(env, scope)
        registered = false
        throw err
      }
      emnapi.closeScope(env, scope)
      return emnapiExports
    }

    addOnInit(function (Module) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      __EMNAPI_RUNTIME_INIT__

      delete Module._napi_register_wasm_v1
      delete Module.__emnapi_runtime_init
      delete Module.__emnapi_execute_async_work

      callInStack(() => {
        // HEAP.*?\[.*?\]
        const key_pp = stackAlloc($POINTER_SIZE)
        const errormessages_pp = stackAlloc($POINTER_SIZE)
        // #if MEMORY64
        __emnapi_runtime_init(BigInt(key_pp), BigInt(errormessages_pp))
        // #else
        __emnapi_runtime_init(key_pp, errormessages_pp)
        // #endif
        const key_p = makeGetValue('key_pp', 0, '*')
        exportsKey = (key_p ? UTF8ToString(key_p) : 'emnapiExports') || 'emnapiExports'
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        errorMessagesPtr = makeGetValue('errormessages_pp', 0, '*') || 0
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

    /* addOnExit(function (_Module) {
      env?.unref()
      env = undefined
    }) */
  }
})
