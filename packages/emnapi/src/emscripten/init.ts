/* eslint-disable @stylistic/indent */
import { from64, makeDynCall, makeSetValue, to64 } from 'emscripten:parse-tools'
import { abort, Module, _malloc, _free } from 'emscripten:runtime'

// declare const global: typeof globalThis
// declare const require: any
// declare const process: any
// declare const __webpack_public_path__: any

// declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value
// declare function _node_api_module_get_api_version_v1 (): number

export interface InitOptions {
  context: Context
  filename?: string
  asyncWorkPoolSize?: number
  nodeBinding?: NodeBinding
}

export var emnapiCtx: Context = undefined!
export var emnapiEnv: Env = undefined!
export var emnapiNodeBinding: NodeBinding = undefined!
export var emnapiAsyncWorkPoolSize: number = 0

const emnapiModule: {
  exports: any
  loaded: boolean
  filename: string
  envObject?: Env
} = {
  exports: {},
  loaded: false,
  filename: ''
}

/**
 * @__deps malloc
 * @__deps free
 */
export function emnapiInit (options: InitOptions): any {
  if (emnapiModule.loaded) return emnapiModule.exports

  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Invalid emnapi init option')
  }

  const context = options.context
  if (typeof context !== 'object' || context === null) {
    throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`")
  }

  emnapiCtx = context

  const filename = typeof options.filename === 'string' ? options.filename : ''
  emnapiModule.filename = filename

  if ('nodeBinding' in options) {
    const nodeBinding = options.nodeBinding
    if (typeof nodeBinding !== 'object' || nodeBinding === null) {
      throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package')
    }
    emnapiNodeBinding = nodeBinding
  }

  if ('asyncWorkPoolSize' in options) {
    if (typeof options.asyncWorkPoolSize !== 'number') {
      throw new TypeError('options.asyncWorkPoolSize must be a integer')
    }
    emnapiAsyncWorkPoolSize = options.asyncWorkPoolSize >> 0
    if (emnapiAsyncWorkPoolSize > 1024) {
      emnapiAsyncWorkPoolSize = 1024
    } else if (emnapiAsyncWorkPoolSize < -1024) {
      emnapiAsyncWorkPoolSize = -1024
    }
  }

  const NODE_MODULE_VERSION = Version.NODE_MODULE_VERSION
  const nodeRegisterModuleSymbol = `node_register_module_v${NODE_MODULE_VERSION}`
  const emscriptenExportedSymbol = `_${nodeRegisterModuleSymbol}`
  if (typeof Module[emscriptenExportedSymbol] === 'function') {
    const scope = emnapiCtx.isolate.openScope()
    try {
      const exports = emnapiModule.exports

      const exportsHandle = scope.add(exports)
      const moduleHandle = scope.add(emnapiModule)
      Module[emscriptenExportedSymbol](to64('exportsHandle'), to64('moduleHandle'), to64('5'))
    } catch (err) {
      if (err !== 'unwind') {
        throw err
      }
    } finally {
      emnapiCtx.isolate.closeScope(scope)
    }
    emnapiModule.loaded = true
    delete emnapiModule.envObject
    return emnapiModule.exports
  }

  const find = Object.keys(Module).filter(k => k.startsWith('_node_register_module_v'))
  if (find.length > 0) {
    throw new Error(`The module${emnapiModule.filename ? ` '${emnapiModule.filename}'` : ''}
was compiled against a different Node.js version using
NODE_MODULE_VERSION ${find[0].slice(23)}. This version of Node.js requires
NODE_MODULE_VERSION ${NODE_MODULE_VERSION}.`)
  }

  const moduleApiVersion = Module._node_api_module_get_api_version_v1()

  const envObject = emnapiModule.envObject || (() => {
    let struct_napi_env__: SNapiEnv
// #if MEMORY64
    struct_napi_env__ = {
      __size__: 56,
      reserved: 0,
      sentinel: 8,
      js_vtable: 16,
      module_vtable: 24,
      last_error: {
        __size__: 24,
        error_message: 32,
        engine_reserved: 40,
        engine_error_code: 48,
        error_code: 52
      }
    }
// #else
    struct_napi_env__ = {
      __size__: 40,
      reserved: 0,
      sentinel: 8,
      js_vtable: 16,
      module_vtable: 20,
      last_error: {
        __size__: 16,
        error_message: 24,
        engine_reserved: 28,
        engine_error_code: 32,
        error_code: 36
      }
    }
// #endif

    let address = _malloc(to64('struct_napi_env__.__size__')) as number
    const errorCodeOffset = struct_napi_env__.last_error.error_code
    const engineErrorCodeOffset = struct_napi_env__.last_error.engine_error_code
    const engineReservedOffset = struct_napi_env__.last_error.engine_reserved
    from64('address')
    const envObject = emnapiModule.envObject = emnapiEnv = emnapiCtx.createEnv(
      filename,
      moduleApiVersion,
      {
        address,
        free: (ptr) => {
          _free(to64('ptr'))
        },
        setLastError (env, error_code, engine_error_code, engine_reserved) {
          from64('engine_reserved')
          makeSetValue('env', 'errorCodeOffset', 'error_code', 'i32')
          makeSetValue('env', 'engineErrorCodeOffset', 'engine_error_code', 'u32')
          makeSetValue('env', 'engineReservedOffset', 'engine_reserved', '*')
        },
        makeDynCall_vppp: (cb: Ptr) => makeDynCall('vppp', 'cb'),
        makeDynCall_vp: (cb: Ptr) => makeDynCall('vp', 'cb'),
        abort
      },
      emnapiNodeBinding
    )
    return envObject
  })()

  const scope = emnapiCtx.openScope(envObject)
  try {
    envObject.callIntoModule((envObject) => {
      const exports = emnapiModule.exports
      const env = envObject.bridge.address
      const exportsHandle = scope.add(exports)
      const napiValue = Module._napi_register_wasm_v1(to64('env'), to64('exportsHandle'))
      emnapiModule.exports = (!napiValue) ? exports : emnapiCtx.jsValueFromNapiValue(napiValue)!
    })
  } catch (err) {
    if (err !== 'unwind') {
      throw err
    }
  } finally {
    emnapiCtx.closeScope(envObject, scope)
  }
  emnapiModule.loaded = true
  delete emnapiModule.envObject
  return emnapiModule.exports
}

export { emnapiInit as $emnapiInit }

/**
 * @__sig i
 */
export function _emnapi_async_work_pool_size (): number {
  return Math.abs(emnapiAsyncWorkPoolSize)
}
