/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { makeDynCall, to64 } from 'emscripten:parse-tools'
import { emnapiTSFN } from '../threadsafe-function'

export interface CreateOptions {
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

export interface InitOptions {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory?: WebAssembly.Memory
  table?: WebAssembly.Table
}

// factory parameter
declare const options: CreateOptions

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
  spawnThread (startArg: number, errorOrTid?: number): number
  startThread (tid: number, startArg: number): void
  initWorker (arg: number): void
  executeAsyncWork (work: number): void
  postMessage?: (msg: any) => any
}

declare const process: any

export var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'
export var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread)
export var reuseWorker = Boolean(options.reuseWorker)

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
export var onCreateWorker: (info: { type: 'thread' | 'async-work' }) => any
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function terminateWorker (worker: any): void {
  const tid = worker.__emnapi_tid
  worker.terminate()
  worker.onmessage = (e: any) => {
    if (e.data.__emnapi__) {
      err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid)
    }
  }
}

function spawnThread (startArg: number, errorOrTid: number): number {
  const isNewABI = errorOrTid !== undefined
  if (!isNewABI) {
    errorOrTid = _malloc(to64('8'))
    if (!errorOrTid) {
      return -48 /* ENOMEM */
    }
  }
  const struct = new Int32Array(wasmMemory.buffer, errorOrTid, 2)
  Atomics.store(struct, 0, 0)
  Atomics.store(struct, 1, 0)

  if (ENVIRONMENT_IS_PTHREAD) {
    const postMessage = napiModule.postMessage!
    postMessage({
      __emnapi__: {
        type: 'spawn-thread',
        payload: {
          startArg,
          errorOrTid
        }
      }
    })
    Atomics.wait(struct, 1, 0)
    const isError = Atomics.load(struct, 0)
    const result = Atomics.load(struct, 1)
    if (isNewABI) {
      return isError
    }
    _free(to64('errorOrTid'))
    return isError ? -result : result
  }

  let worker: any
  try {
    worker = PThread.getNewWorker()
    if (!worker) {
      throw new Error('failed to get new worker')
    }
  } catch (e) {
    const EAGAIN = 6

    Atomics.store(struct, 0, 1)
    Atomics.store(struct, 1, EAGAIN)
    Atomics.notify(struct, 1)

    err(e.message)
    if (isNewABI) {
      return 1
    }
    _free(to64('errorOrTid'))
    return -EAGAIN
  }

  const tid = PThread.nextWorkerID + 43

  Atomics.store(struct, 0, 0)
  Atomics.store(struct, 1, tid)
  Atomics.notify(struct, 1)

  const WASI_THREADS_MAX_TID = 0x1FFFFFFF
  PThread.nextWorkerID = (PThread.nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42)
  PThread.pthreads[tid] = worker
  worker.__emnapi_tid = tid
  PThread.runningWorkers.push(worker)
  if (ENVIRONMENT_IS_NODE) {
    worker.ref()
  }

  worker.postMessage({
    __emnapi__: {
      type: 'start',
      payload: {
        tid,
        arg: startArg
      }
    }
  })

  if (isNewABI) {
    return 0
  }
  _free(to64('errorOrTid'))
  return tid
}

function startThread (tid: number, startArg: number): void {
  if (napiModule.childThread) {
    if (typeof wasmInstance.exports.wasi_thread_start !== 'function') {
      throw new TypeError('wasi_thread_start is not exported')
    }
    const postMessage = napiModule.postMessage!
    ;(wasmInstance.exports.wasi_thread_start as Function)(tid, startArg)
    postMessage({
      __emnapi__: {
        type: 'cleanup-thread',
        payload: {
          tid
        }
      }
    })
  } else {
    throw new Error('startThread is only available in child threads')
  }
}

napiModule.spawnThread = spawnThread
napiModule.startThread = startThread

export var PThread = {
  unusedWorkers: [] as any[],
  runningWorkers: [] as any[],
  pthreads: Object.create(null),
  nextWorkerID: 0,
  init () {},
  returnWorkerToPool (worker: any) {
    var tid = worker.__emnapi_tid
    delete PThread.pthreads[tid]
    PThread.unusedWorkers.push(worker)
    PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1)
    delete worker.__emnapi_tid
    if (ENVIRONMENT_IS_NODE) {
      worker.unref()
    }
  },
  loadWasmModuleToWorker: (worker: any) => {
    if (worker.whenLoaded) return worker.whenLoaded
    worker.whenLoaded = new Promise<any>((resolve, reject) => {
      worker.onmessage = function (e: any) {
        if (e.data.__emnapi__) {
          const type = e.data.__emnapi__.type
          const payload = e.data.__emnapi__.payload
          if (type === 'loaded') {
            worker.loaded = true
            if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
              worker.unref()
            }
            resolve(worker)
            // if (payload.err) {
            //   err('failed to load in child thread: ' + (payload.err.message || payload.err))
            // }
          } else if (type === 'spawn-thread') {
            spawnThread(payload.startArg, payload.errorOrTid)
          } else if (type === 'cleanup-thread') {
            if (reuseWorker) {
              PThread.returnWorkerToPool(worker)
            } else {
              delete PThread.pthreads[payload.tid]
              PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1)
              terminateWorker(worker)
              delete worker.__emnapi_tid
            }
          }
        }
      }
      worker.onerror = (e: any) => {
        const message = 'worker sent an error!'
        // if (worker.pthread_ptr) {
        //   message = 'Pthread ' + ptrToString(worker.pthread_ptr) + ' sent an error!'
        // }
        err(message + ' ' + e.message)
        reject(e)
        throw e
      }
      if (ENVIRONMENT_IS_NODE) {
        worker.on('message', function (data: any) {
          worker.onmessage({
            data
          })
        })
        worker.on('error', function (e: any) {
          worker.onerror(e)
        })
        worker.on('detachedExit', function () {})
      }
      // napiModule.emnapi.addSendListener(worker)
      emnapiAddSendListener(worker)
      if (typeof emnapiTSFN !== 'undefined') {
        emnapiTSFN.addListener(worker)
      }
      try {
        worker.postMessage({
          __emnapi__: {
            type: 'load',
            payload: {
              wasmModule,
              wasmMemory
            }
          }
        })
      } catch (err) {
        if (typeof SharedArrayBuffer === 'undefined' || !(wasmMemory.buffer instanceof SharedArrayBuffer)) {
          throw new Error(
            'Multithread features require shared wasm memory. ' +
            'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking'
          )
        }
        throw err
      }
    })
    return worker.whenLoaded
  },
  allocateUnusedWorker () {
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not provided')
    }
    const worker = onCreateWorker({ type: 'thread' })
    PThread.unusedWorkers.push(worker)
    return worker
  },
  getNewWorker () {
    if (reuseWorker) {
      if (PThread.unusedWorkers.length === 0) {
        const worker = PThread.allocateUnusedWorker()
        PThread.loadWasmModuleToWorker(worker)
      }
      return PThread.unusedWorkers.pop()
    }
    const worker = PThread.allocateUnusedWorker()
    PThread.loadWasmModuleToWorker(worker)
    return worker
  }
}
