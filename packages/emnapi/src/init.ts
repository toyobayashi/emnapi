/* eslint-disable no-unreachable */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const global: typeof globalThis
declare const require: any
declare const process: any
declare const __webpack_public_path__: any

declare const __EMNAPI_RUNTIME_REPLACE__: string

declare let emnapiRt: EmnapiRuntime
declare let emnapiCtx: Context

declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value
declare function __emnapi_runtime_init (...args: [Ptr]): void

mergeInto(LibraryManager.library, {
  $emnapiRt: undefined,
  $emnapiRt__postset: __EMNAPI_RUNTIME_REPLACE__,

  $emnapiCtx: undefined,
  $emnapiCtx__deps: ['$emnapiRt'],

  $emnapiRuntimeInit__deps: ['$emnapiRt', '$emnapiCtx'],
  $emnapiRuntimeInit: function emnapiRuntimeInit (Module: any) {
    const _global = (function () {
      if (typeof globalThis !== 'undefined') return globalThis
      let g = (function (this: any) { return this })()
      if (
        !g &&
        (function () {
          let f
          try {
            f = new Function()
          } catch (_) {
            return false
          }
          return typeof f === 'function'
        })()
      ) {
        try {
          g = new Function('return this')()
        } catch (_) {}
      }

      if (!g) {
        if (typeof __webpack_public_path__ === 'undefined') {
          if (typeof global !== 'undefined') return global
        }
        if (typeof window !== 'undefined') return window
        if (typeof self !== 'undefined') return self
      }

      return g
    })()
    return new Promise<typeof emnapiRt>(function (resolve, reject) {
      if ('emnapiRuntime' in Module) {
        if (typeof Module.emnapiRuntime === 'function') {
          resolve(Module.emnapiRuntime())
        } else {
          resolve(Module.emnapiRuntime)
        }
        return
      }

      if (typeof emnapiRt !== 'undefined') {
        resolve(emnapiRt)
        return
      }

      if (typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string') {
        const error = new Error('Emnapi runtime is not detected. Try to run "npm install @tybys/emnapi-runtime" first')
        if (typeof require === 'function') {
          try {
            resolve(require('@tybys/emnapi-runtime'))
          } catch (_) {
            reject(error)
          }
        } else {
          try {
            // @ts-expect-error
            import('@tybys/emnapi-runtime').then(resolve, function () {
              reject(error)
            })
          } catch (_) {
            reject(error)
          }
        }
      } else {
        resolve(_global.emnapi)
      }
    }).then(function (result) {
      if (!result) {
        throw new Error('Emnapi runtime is not detected. Check if the runtime code is imported or consider using builtin runtime js library.')
      }
      emnapiRt = result
      return emnapiRt
    }).then(function (emnapiRt) {
      if ('emnapiContext' in Module) {
        if (typeof Module.emnapiContext === 'function') {
          return Module.emnapiContext(emnapiRt)
        }

        return Module.emnapiContext
      }
      if (!_global.__emnapi_context__) {
        _global.__emnapi_context__ = emnapiRt.createContext()
      }
      return _global.__emnapi_context__
    }).then(function (ctx) {
      if (!ctx) {
        throw new Error('Missing emnapi runtime context. Use "Module.emnapiContext" to specify a context.')
      }
      emnapiCtx = ctx
    })
  },

  $emnapiInit__postset: 'addOnPreRun(function (Module) {' +
    'addRunDependency("emnapi-init");' +
    'emnapiRuntimeInit(Module).then(function () {' +
      'emnapiInit();' +
      'removeRunDependency("emnapi-init");' +
    '}, function (err) {' +
      'if (typeof Module.onEmnapiInitialized === "function") {' +
        'Module.onEmnapiInitialized(err);' +
      '} else {' +
        'throw err;' +
      '}' +
    '});' +
  '});',
  $emnapiInit__deps: [
    '$emnapiCtx',
    '$emnapiRuntimeInit',
    'napi_register_wasm_v1',
    '_emnapi_runtime_init'
  ],
  $emnapiInit: function () {
    let registered = false
    let emnapiExports: any
    let exportsKey: string
    let env: Env | undefined

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

      env = emnapiCtx.createEnv(
        (cb: Ptr) => $makeDynCall('vppp', 'cb')
      )
      const scope = emnapiCtx.openScope(env)
      try {
        emnapiExports = env.callIntoModule((_envObject) => {
          const exports = {}
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const exportsHandle = scope.add(exports)
          const napiValue = _napi_register_wasm_v1($to64('_envObject.id'), $to64('exportsHandle.id'))
          $from64('napiValue')
          return (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
        })
      } catch (err) {
        emnapiCtx.closeScope(env, scope)
        registered = false
        throw err
      }
      emnapiCtx.closeScope(env, scope)
      return emnapiExports
    }

    __ATINIT__.push(function (Module) {
      delete Module._napi_register_wasm_v1
      delete Module.__emnapi_runtime_init

      callInStack(() => {
        // HEAP.*?\[.*?\]
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const key_pp = stackAlloc($POINTER_SIZE)/* ; const errormessages_pp = stackAlloc($POINTER_SIZE) */
        __emnapi_runtime_init($to64('key_pp'))
        const key_p = $makeGetValue('key_pp', 0, '*')
        exportsKey = (key_p ? UTF8ToString(key_p) : 'emnapiExports') || 'emnapiExports'
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
