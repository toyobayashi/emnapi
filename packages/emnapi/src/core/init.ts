/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-var */

declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  onCreateWorker?: () => any
  print?: () => void
  printErr?: () => void
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
  // PThread: {
  //   pthreads: any[]
  // }
  envObject?: Env

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table): any
  spawnThread (startArg: number): number
}

var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread)

var wasmMemory: WebAssembly.Memory

var wasmTable: WebAssembly.Table

var _malloc: any, _free: any

function abort (msg: string): never {
  if (typeof WebAssembly.RuntimeError === 'function') {
    throw new WebAssembly.RuntimeError(msg)
  }
  throw Error(msg)
}

function runtimeKeepalivePush (): void {}

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

  // PThread: {
  //   pthreads: [undefined]
  // },
  spawnThread: undefined!,

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table) {
    if (napiModule.loaded) return napiModule.exports
    wasmMemory = memory || instance.exports.memory as WebAssembly.Memory
    wasmTable = table || instance.exports.__indirect_function_table as WebAssembly.Table
    _malloc = instance.exports.malloc
    _free = instance.exports.free

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const envObject = napiModule.envObject || (napiModule.envObject = emnapiCtx.createEnv(
      (cb: Ptr) => $makeDynCall('vppp', 'cb'),
      (cb: Ptr) => $makeDynCall('vp', 'cb')
    ))

    const scope = emnapiCtx.openScope(envObject)
    try {
      envObject.callIntoModule((_envObject) => {
        const exports = napiModule.exports
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
var onCreateWorker: () => any
var out: (str: string) => void
var err: (str: string) => void

if (!ENVIRONMENT_IS_PTHREAD) {
  const context = options.context
  if (typeof context !== 'object' || context === null) {
    throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`")
  }
  emnapiCtx = context
} else {
  emnapiCtx = options?.context
}

if (typeof options.filename === 'string') {
  napiModule.filename = options.filename
}

if (typeof options.onCreateWorker === 'function') {
  onCreateWorker = options.onCreateWorker
}
if (typeof options.print === 'function') {
  out = options.print
} else {
  out = console.log.bind(console)
}
if (typeof options.printErr === 'function') {
  err = options.printErr
} else {
  err = console.warn.bind(console)
}

if ('nodeBinding' in options) {
  const nodeBinding = options.nodeBinding
  if (typeof nodeBinding !== 'object' || nodeBinding === null) {
    throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package')
  }
  emnapiNodeBinding = nodeBinding
}
