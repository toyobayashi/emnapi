/* eslint-disable no-unreachable */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

// declare const global: typeof globalThis
// declare const require: any
// declare const process: any
// declare const __webpack_public_path__: any

declare let emnapiCtx: Context
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare let emnapiNodeBinding: NodeBinding

declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value

declare const emnapiModule: {
  exports: any
  loaded: boolean
  filename: string
  envObject?: Env
}

declare interface InitOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
}

mergeInto(LibraryManager.library, {
  $emnapiCtx: undefined,
  $emnapiNodeBinding: undefined,
  $emnapiModule: {
    exports: {},
    loaded: false,
    filename: ''
  },

  $emnapiInit__deps: ['$emnapiModule', '$emnapiCtx', '$emnapiNodeBinding', 'napi_register_wasm_v1'],
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

    if ('nodeBinding' in options) {
      const nodeBinding = options.nodeBinding
      if (typeof nodeBinding !== 'object' || nodeBinding === null) {
        throw new TypeError('Invalid `options.nodeBinding`. Use @tybys/emnapi-node-binding package')
      }
      emnapiNodeBinding = nodeBinding
    }

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const envObject = emnapiModule.envObject || (emnapiModule.envObject = emnapiCtx.createEnv(
      (cb: Ptr) => $makeDynCall('vppp', 'cb'),
      (cb: Ptr) => $makeDynCall('vp', 'cb')
    ))

    const scope = emnapiCtx.openScope(envObject)
    try {
      envObject.callIntoModule((_envObject) => {
        const exports = emnapiModule.exports
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const exportsHandle = scope.add(exports)
        const napiValue = _napi_register_wasm_v1($to64('_envObject.id'), $to64('exportsHandle.id'))
        emnapiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      emnapiCtx.closeScope(envObject, scope)
      throw err
    }
    emnapiCtx.closeScope(envObject, scope)
    emnapiModule.loaded = true
    delete emnapiModule.envObject
    return emnapiModule.exports
  }
})
