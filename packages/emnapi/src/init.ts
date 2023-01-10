/* eslint-disable no-unreachable */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

// declare const global: typeof globalThis
// declare const require: any
// declare const process: any
// declare const __webpack_public_path__: any

declare let emnapiCtx: Context

declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value

declare const emnapiModule: {
  exports: any
  loaded: boolean
  filename: string | null
}

declare interface InitOptions {
  context: Context
  filename?: string
}

mergeInto(LibraryManager.library, {
  $emnapiCtx: undefined,
  $emnapiModule: {
    exports: {},
    loaded: false,
    filename: null
  },

  $emnapiInit__postset: 'Module.emnapiInit = emnapiInit;',
  $emnapiInit__deps: ['$emnapiModule', '$emnapiCtx'],
  $emnapiInit: function (options: InitOptions) {
    if (emnapiModule.loaded) return emnapiModule.exports

    if (typeof options !== 'object' || options === null) {
      throw new TypeError('Invalid emnapi init option')
    }

    const context = options.context

    if (typeof context !== 'object' || context === null) {
      throw new TypeError("Invalid `options.context`. You can create a context by `import { createContext } from '@tybys/emnapi-runtime`'")
    }

    emnapiCtx = context

    if (typeof options.filename === 'string') {
      emnapiModule.filename = options.filename
    }

    const envObject = emnapiCtx.createEnv(
      (cb: Ptr) => $makeDynCall('vppp', 'cb')
    )
    const scope = emnapiCtx.openScope(envObject)
    try {
      envObject.callIntoModule((_envObject) => {
        const exports = emnapiModule.exports
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1($to64('_envObject.id'), $to64('exportsHandle.id'))
        $from64('napiValue')
        emnapiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      emnapiCtx.closeScope(envObject, scope)
      throw err
    }
    emnapiCtx.closeScope(envObject, scope)
    emnapiModule.loaded = true
    return emnapiModule.exports
  }
})
