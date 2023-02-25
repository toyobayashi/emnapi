/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-var */

declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
}

declare interface InitOptions {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory?: WebAssembly.Memory
  table?: WebAssembly.Table
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
  emnapi: any
  loaded: boolean
  filename: string
  envObject?: Env

  init (options: InitOptions): any
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var wasmModule: WebAssembly.Module
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var wasmMemory: WebAssembly.Memory
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var wasmTable: WebAssembly.Table

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var _malloc: any, _free: any

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function abort (msg: string): never {
  if (typeof WebAssembly.RuntimeError === 'function') {
    throw new WebAssembly.RuntimeError(msg)
  }
  throw Error(msg)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function runtimeKeepalivePush (): void {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function runtimeKeepalivePop (): void {}

// eslint-disable-next-line no-var
var napiModule: INapiModule = {
  imports: {
    env: {},
    napi: {},
    emnapi: {}
  },
  exports: {},
  emnapi: {},
  loaded: false,
  filename: '',

  init (options: InitOptions) {
    if (napiModule.loaded) return napiModule.exports
    if (!options) throw new TypeError('Invalid napi init options')
    const instance = options.instance
    if (!instance?.exports) throw new TypeError('Invalid wasm instance')
    const exports = instance.exports
    const module = options.module
    const memory = options.memory || exports.memory
    const table = options.table || exports.__indirect_function_table
    if (!(module instanceof WebAssembly.Module)) throw new TypeError('Invalid wasm module')
    if (!(memory instanceof WebAssembly.Memory)) throw new TypeError('Invalid wasm memory')
    if (!(table instanceof WebAssembly.Table)) throw new TypeError('Invalid wasm table')
    wasmModule = module
    wasmMemory = memory
    wasmTable = table
    if (typeof exports.malloc !== 'function') throw new TypeError('malloc is not exported')
    if (typeof exports.free !== 'function') throw new TypeError('free is not exported')
    _malloc = exports.malloc
    _free = exports.free

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
    } finally {
      emnapiCtx.closeScope(envObject, scope)
    }
    napiModule.loaded = true
    delete napiModule.envObject
    return napiModule.exports
  }
}

var emnapiCtx: Context
var emnapiNodeBinding: NodeBinding

const context = options.context
if (typeof context !== 'object' || context === null) {
  throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`")
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
emnapiCtx = context

if (typeof options.filename === 'string') {
  napiModule.filename = options.filename
}

if ('nodeBinding' in options) {
  const nodeBinding = options.nodeBinding
  if (typeof nodeBinding !== 'object' || nodeBinding === null) {
    throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package')
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emnapiNodeBinding = nodeBinding
}
