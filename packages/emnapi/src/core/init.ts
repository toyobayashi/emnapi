/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-var */

declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
}

// factory parameter
declare const options: CreateOptions

declare interface INapiModule {
  imports: {
    env: any
    napi: any
    emnapi: any
  }
  exports: any
  loaded: boolean
  filename: string
  envObject?: Env

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table): any
}

var wasmMemory: WebAssembly.Memory
var wasmTable: WebAssembly.Table

// eslint-disable-next-line no-var
var napiModule: INapiModule = {
  imports: {
    env: {},
    napi: {},
    emnapi: {}
  },
  exports: {},
  loaded: false,
  filename: '',

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table) {
    if (napiModule.loaded) return napiModule.exports
    wasmMemory = memory || instance.exports.memory as WebAssembly.Memory
    wasmTable = table || instance.exports.__indirect_function_table as WebAssembly.Table

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const envObject = napiModule.envObject || (napiModule.envObject = emnapiCtx.createEnv(
      (cb: Ptr) => $makeDynCall('vppp', 'cb'),
      (cb: Ptr) => $makeDynCall('vp', 'cb')
    ))

    const scope = emnapiCtx.openScope(envObject)
    try {
      envObject.callIntoModule((_envObject) => {
        const exports = napiModule.exports
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const exportsHandle = scope.add(exports)
        const napi_register_wasm_v1 = instance.exports.napi_register_wasm_v1 as Function
        const napiValue = napi_register_wasm_v1($to64('_envObject.id'), $to64('exportsHandle.id'))
        napiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      emnapiCtx.closeScope(envObject, scope)
      throw err
    }
    emnapiCtx.closeScope(envObject, scope)
    napiModule.loaded = true
    delete napiModule.envObject
    return napiModule.exports
  }
}

var emnapiCtx: Context
var emnapiNodeBinding: NodeBinding

const context = options.context
if (typeof context !== 'object' || context === null) {
  throw new TypeError("Invalid `options.context`. You can create a context by `import { createContext } from '@tybys/emnapi-runtime`'")
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
emnapiCtx = context

if (typeof options.filename === 'string') {
  napiModule.filename = options.filename
}

if ('nodeBinding' in options) {
  const nodeBinding = options.nodeBinding
  if (typeof nodeBinding !== 'object' || nodeBinding === null) {
    throw new TypeError('Invalid `options.nodeBinding`. Use @tybys/emnapi-node-binding package')
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emnapiNodeBinding = nodeBinding
}
