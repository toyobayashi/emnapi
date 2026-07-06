/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

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
  initWorker (arg: number, func: [number, number]): void
  /**
   * Must synchronously enqueue the message. Before throwing for a message that
   * was not enqueued, set `error.emnapiNotDelivered = true`; unmarked failures
   * are ambiguous and thread-safe function control messages may be retried.
   * The `any` return type is retained for v1 API compatibility; Promise-like
   * transports are unsupported because this channel also carries
   * non-idempotent worker protocols.
   */
  postMessage?: (msg: any) => any

  waitThreadStart: boolean | number
  PThread: ThreadManager
}

declare const process: any

export var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
export var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread)
export var waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart)

export var wasmInstance: WebAssembly.Instance
export var wasmModule: WebAssembly.Module
export var wasmMemory: WebAssembly.Memory

export var wasmTable: WebAssembly.Table

export var _malloc: any
export var _free: any

export function abort (msg?: string): never {
  if (typeof WebAssembly.RuntimeError === 'function') {
    throw new WebAssembly.RuntimeError(msg)
  }
  throw Error(msg)
}

export function runtimeKeepalivePush (): void {}

export function runtimeKeepalivePop (): void {}

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
    _malloc = exports.malloc
    _free = exports.free

    if (!napiModule.childThread) {
      // main thread only
      let moduleApiVersion = Version.NODE_API_DEFAULT_MODULE_API_VERSION
      const node_api_module_get_api_version_v1 = instance.exports.node_api_module_get_api_version_v1
      if (typeof node_api_module_get_api_version_v1 === 'function') {
        moduleApiVersion = node_api_module_get_api_version_v1()
      }
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
          const napiValue = napi_register_wasm_v1(to64('_envObject.id'), to64('exportsHandle.id'))
          napiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
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
export var emnapiPostMessageTransport: {
  post: (message: any) => unknown
  throwsAreDefinitelyNotDelivered: boolean
} | undefined

function consumePostMessageThenable (result: unknown): void {
  if (
    !result ||
    (typeof result !== 'object' && typeof result !== 'function')
  ) {
    return
  }
  void Promise.resolve().then(() => {
    let then: unknown
    try {
      then = (result as { then?: unknown }).then
    } catch (_) {
      return
    }
    if (typeof then === 'function') {
      try {
        then.call(result, () => {}, () => {})
      } catch (_) {}
    }
  })
}

/**
 * Non-TSFN worker protocols are not idempotent. The v1 public type still
 * permits any return value, but transports must synchronously enqueue.
 */
export function emnapiPostMessage (message: any): void {
  const post = emnapiPostMessageTransport?.post ||
    (napiModule.postMessage as ((message: any) => unknown) | undefined)
  const result = post!(message)
  consumePostMessageThenable(result)
}

if (!ENVIRONMENT_IS_PTHREAD) {
  const context = options.context
  if (typeof context !== 'object' || context === null) {
    throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`")
  }
  emnapiCtx = context
} else {
  emnapiCtx = options?.context

  const configuredPostMessage = options.postMessage
  const globalPostMessage = typeof postMessage === 'function'
    ? postMessage
    : undefined
  const isGlobalPostMessage = configuredPostMessage === globalPostMessage
  const postMsg = typeof configuredPostMessage === 'function'
    ? isGlobalPostMessage
      ? configuredPostMessage.bind(globalThis) as
        (message: any) => unknown
      : configuredPostMessage as (message: any) => unknown
    : globalPostMessage?.bind(globalThis) as
      ((message: any) => unknown) | undefined
  if (typeof postMsg !== 'function') {
    throw new TypeError('No postMessage found')
  }
  napiModule.postMessage = postMsg
  emnapiPostMessageTransport = {
    post (message) {
      return (napiModule.postMessage as (message: any) => unknown)(message)
    },
    get throwsAreDefinitelyNotDelivered () {
      return (
        typeof configuredPostMessage !== 'function' &&
        napiModule.postMessage === postMsg
      )
    }
  }
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
    const __emnapi__ = data?.__emnapi__
    if (__emnapi__ && __emnapi__.type === 'async-send') {
      const payload = __emnapi__.payload
      if (
        !payload ||
        typeof payload.callback !== 'number' ||
        !Number.isSafeInteger(payload.callback) ||
        payload.callback < 0 ||
        (
          typeof payload.data !== 'bigint' &&
          (
            typeof payload.data !== 'number' ||
            !Number.isSafeInteger(payload.data)
          )
        )
      ) return
      if (ENVIRONMENT_IS_PTHREAD) {
        emnapiPostMessage({ __emnapi__ })
      } else {
        const callback = payload.callback
        makeDynCall('vp', 'callback')(payload.data)
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
