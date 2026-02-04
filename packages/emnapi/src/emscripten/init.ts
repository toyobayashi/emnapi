import { from64, makeDynCall, to64 } from 'emscripten:parse-tools'
import { abort, Module, _malloc, _free, _napi_set_last_error, _emnapi_create_env, _emnapi_delete_env } from 'emscripten:runtime'

// declare const global: typeof globalThis
// declare const require: any
// declare const process: any
// declare const __webpack_public_path__: any

// declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value
// declare function _node_api_module_get_api_version_v1 (): number

declare const updateTableMap: any

export interface InitOptions {
  context: Context
  filename?: string
  asyncWorkPoolSize?: number
  nodeBinding?: NodeBinding
}

export var emnapiCtx: Context = undefined!
export var emnapiEnv: Env = undefined!
export var emnapiRuntimeModuleExports: any = undefined!
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
    // const runtimeModule = new WebAssembly.Module(__EMNAPI_RUNTIME_BINARY__)
    // const meta = emnapiCtx.getDylinkMetadata(runtimeModule)
    // const align = Math.pow(2, meta.memoryAlign)
    // let size = meta.memorySize + align
    // const alignMemory = (size: number, alignment: number) => (Math.ceil(size / alignment) * alignment)
    // let memoryBase = _malloc(to64('size')) as number
    // from64('memoryBase')
    // memoryBase = alignMemory(memoryBase, align)
    // const tableBase = meta.tableSize ? wasmTable.length : 0
    // var tableGrowthNeeded = tableBase + meta.tableSize - wasmTable.length
    // if (tableGrowthNeeded > 0) {
    //   wasmTable.grow(tableGrowthNeeded)
    // }
    // const instance = new WebAssembly.Instance(runtimeModule, {
    //   env: {
    //     memory: wasmMemory,
    //     malloc: _malloc,
    //     _emnapi_get_node_api_js_vtable: () => 0,
    //     _emnapi_get_node_api_module_vtable: () => 0,
    //     free: _free,
    //     __memory_base: memoryBase,
    //     __table_base: tableBase,
    //     __indirect_function_table: wasmTable
    //   }
    // })
    // emnapiRuntimeModuleExports = instance.exports
    // emnapiRuntimeModuleExports.__wasm_apply_data_relocs?.()
    // emnapiRuntimeModuleExports.__wasm_call_ctors?.()
    // if (typeof updateTableMap === 'function') {
    //   updateTableMap(tableBase, meta.tableSize)
    // }

    let address = _emnapi_create_env(0) as number
    from64('address')
    address += 8
    const envObject = emnapiModule.envObject = emnapiEnv = emnapiCtx.createEnv(
      filename,
      moduleApiVersion,
      {
        address,
        free: (ptr) => {
          _free(to64('ptr'))
        },
        deleteEnv: (ptr) => {
          _emnapi_delete_env((to64('ptr') as number) - (to64('8') as number))
        },
        setLastError: _napi_set_last_error,
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
