/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  reuseWorker?: boolean
  asyncWorkPoolSize?: number
  onCreateWorker?: () => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
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
  childThread: boolean
  envObject?: Env

  init (options: InitOptions): any
  spawnThread (startArg: number, errorOrTid?: number): number
  startThread (tid: number, startArg: number): void
  initWorker (arg: number): void
  executeAsyncWork (work: number): void
  postMessage?: (msg: any) => any
}

var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread)
var reuseWorker = Boolean(options.reuseWorker)
var asyncWorkPoolSize = 'asyncWorkPoolSize' in options ? (Number(options.asyncWorkPoolSize) || 0) : 0
if (asyncWorkPoolSize < 0) {
  throw new RangeError('options.asyncWorkPoolSize must be a non-negative integer')
}
var singleThreadAsyncWork = asyncWorkPoolSize === 0

var wasmInstance: WebAssembly.Instance
var wasmModule: WebAssembly.Module
var wasmMemory: WebAssembly.Memory

var wasmTable: WebAssembly.Table

var _malloc: any
var _free: any

function abort (msg?: string): never {
  if (typeof WebAssembly.RuntimeError === 'function') {
    throw new WebAssembly.RuntimeError(msg)
  }
  throw Error(msg)
}

function runtimeKeepalivePush (): void {}

function runtimeKeepalivePop (): void {}

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
  childThread: Boolean(options.childThread),

  spawnThread: undefined!,
  startThread: undefined!,
  initWorker: undefined!,
  executeAsyncWork: undefined!,

  init (options: InitOptions) {
    if (napiModule.loaded) return napiModule.exports
    if (!options) throw new TypeError('Invalid napi init options')
    const instance = options.instance
    if (!instance?.exports) throw new TypeError('Invalid wasm instance')
    wasmInstance = instance
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

    if (!napiModule.childThread) {
      // main thread only

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
      } finally {
        emnapiCtx.closeScope(envObject, scope)
      }
      napiModule.loaded = true
      delete napiModule.envObject
      return napiModule.exports
    }
  }
}

var emnapiCtx: Context
var emnapiNodeBinding: NodeBinding
var onCreateWorker: (info: { type: 'pthread' | 'async-work' }) => any
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

  const postMsg = typeof options.postMessage === 'function'
    ? options.postMessage
    : typeof postMessage === 'function'
      ? postMessage
      : undefined
  if (typeof postMsg !== 'function') {
    throw new TypeError('No postMessage found')
  }
  napiModule.postMessage = postMsg
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
