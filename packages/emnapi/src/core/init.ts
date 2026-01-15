import { makeDynCall, to64 } from 'emscripten:parse-tools'

export interface InitOptions {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory?: WebAssembly.Memory
  table?: WebAssembly.Table
}

export interface INapiModule {
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
  initWorker (arg: number): void
  executeAsyncWork (work: number): void
  postMessage?: (msg: any) => any

  waitThreadStart: boolean | number
  PThread: ThreadManager

  plugins?: EmnapiPlugin[]
}

declare const process: any

export var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
export var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread)
export var waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart)

export var wasmInstance: WebAssembly.Instance
export var wasmModule: WebAssembly.Module
export var wasmMemory: WebAssembly.Memory

export var wasmTable: WebAssembly.Table

export var _malloc: (size: number | bigint) => void_p
export var _free: (ptr: void_p) => void

export function abort (msg?: string): never {
  if (typeof WebAssembly.RuntimeError === 'function') {
    throw new WebAssembly.RuntimeError(msg)
  }
  throw Error(msg)
}

export function runtimeKeepalivePush (): void {}

export function runtimeKeepalivePop (): void {}

export function getWasmTableEntry (index: number): Function | null {
  return wasmTable.get(index) as Function | null
}

export function setWasmTableEntry (index: number, func: Function | null): void {
  wasmTable.set(index, func)
}

export var napiModule: INapiModule = {
  imports: {
    env: {},
    napi: {},
    emnapi: {}
  },
  exports: {},
  emnapi: {},
  loaded: false,
  filename: '',
  childThread: ENVIRONMENT_IS_PTHREAD,

  initWorker: undefined!,
  executeAsyncWork: undefined!,

  waitThreadStart,
  PThread: undefined!,

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
    _malloc = exports.malloc as (size: number | bigint) => void_p
    _free = exports.free as (ptr: void_p) => void

    if (!napiModule.childThread) {
      // main thread only
      const NODE_MODULE_VERSION = Version.NODE_MODULE_VERSION
      const nodeRegisterModuleSymbol = `node_register_module_v${NODE_MODULE_VERSION}`
      if (typeof instance.exports[nodeRegisterModuleSymbol] === 'function') {
        const scope = emnapiCtx.isolate.openScope()
        try {
          const exports = napiModule.exports

          const exportsHandle = scope.add(exports)
          const moduleHandle = scope.add(napiModule)
          instance.exports[nodeRegisterModuleSymbol](to64('exportsHandle'), to64('moduleHandle'), to64('5'))
        } catch (err) {
          if (err !== 'unwind') {
            throw err
          }
        } finally {
          emnapiCtx.isolate.closeScope(scope)
        }
        napiModule.loaded = true
        delete napiModule.envObject
        return napiModule.exports
      }

      const find = Object.keys(instance.exports).filter(k => k.startsWith('node_register_module_v'))
      if (find.length > 0) {
        throw new Error(`The module${napiModule.filename ? ` '${napiModule.filename}'` : ''}
    was compiled against a different Node.js version using
    NODE_MODULE_VERSION ${find[0].slice(22)}. This version of Node.js requires
    NODE_MODULE_VERSION ${NODE_MODULE_VERSION}.`)
      }

      let moduleApiVersion = Version.NODE_API_DEFAULT_MODULE_API_VERSION
      const node_api_module_get_api_version_v1 = instance.exports.node_api_module_get_api_version_v1
      if (typeof node_api_module_get_api_version_v1 === 'function') {
        moduleApiVersion = node_api_module_get_api_version_v1()
      }

      const envObject = napiModule.envObject || (napiModule.envObject = emnapiCtx.createEnv(
        napiModule.filename,
        moduleApiVersion,
        (cb: Ptr) => makeDynCall('vppp', 'cb'),
        (cb: Ptr) => makeDynCall('vp', 'cb'),
        abort,
        emnapiNodeBinding
      ))

      const scope = emnapiCtx.openScope(envObject)
      try {
        envObject.callIntoModule((_envObject) => {
          const exports = napiModule.exports
          const exportsHandle = scope.add(exports)
          const napi_register_wasm_v1 = instance.exports.napi_register_wasm_v1 as Function
          const napiValue = napi_register_wasm_v1(to64('_envObject.id'), to64('exportsHandle'))
          napiModule.exports = (!napiValue) ? exports : emnapiCtx.jsValueFromNapiValue(napiValue)!
        })
      } catch (e) {
        if (e !== 'unwind') {
          throw e
        }
      } finally {
        emnapiCtx.closeScope(envObject, scope)
      }
      napiModule.loaded = true
      delete napiModule.envObject
      return napiModule.exports
    }
  }
}

export var emnapiCtx: Context
export var emnapiNodeBinding: NodeBinding
export var onCreateWorker: (info: { type: 'thread' | 'async-work'; name: string }) => any = undefined!
export var out: (str: string) => void
export var err: (str: string) => void

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

export var emnapiAsyncWorkPoolSize = 0
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
export var singleThreadAsyncWork = ENVIRONMENT_IS_PTHREAD ? false : (emnapiAsyncWorkPoolSize <= 0)

export function _emnapi_async_work_pool_size (): number {
  return Math.abs(emnapiAsyncWorkPoolSize)
}

napiModule.imports.env._emnapi_async_work_pool_size = _emnapi_async_work_pool_size

// ------------------------------ pthread -------------------------------

function emnapiAddSendListener (worker: any): boolean {
  if (!worker) return false
  if (worker._emnapiSendListener) return true
  const handler = function (e: any): void {
    const data = ENVIRONMENT_IS_NODE ? e : e.data
    const __emnapi__ = data.__emnapi__
    if (__emnapi__ && __emnapi__.type === 'async-send') {
      if (ENVIRONMENT_IS_PTHREAD) {
        const postMessage = napiModule.postMessage!
        postMessage({ __emnapi__ })
      } else {
        const callback = __emnapi__.payload.callback
        makeDynCall('vp', 'callback')(__emnapi__.payload.data)
      }
    }
  }
  const dispose = function (): void {
    if (ENVIRONMENT_IS_NODE) {
      worker.off('message', handler)
    } else {
      worker.removeEventListener('message', handler, false)
    }
    delete worker._emnapiSendListener
  }
  worker._emnapiSendListener = { handler, dispose }
  if (ENVIRONMENT_IS_NODE) {
    worker.on('message', handler)
  } else {
    worker.addEventListener('message', handler, false)
  }
  return true
}

napiModule.emnapi.addSendListener = emnapiAddSendListener

export var PThread = new ThreadManager(
  ENVIRONMENT_IS_PTHREAD
    ? {
        printErr: err,
        childThread: true
      }
    : {
        printErr: err,
        beforeLoad: (worker) => {
          emnapiAddSendListener(worker)
        },
        reuseWorker: options.reuseWorker,
        onCreateWorker: onCreateWorker as ThreadManagerOptionsMain['onCreateWorker']
      }
)

napiModule.PThread = PThread

export * from './addfunction'
