import type { Worker } from 'worker_threads'
import { ENVIRONMENT_IS_NODE, deserizeErrorFromBuffer, getPostMessage, isTrapError } from './util'
import { checkSharedWasmMemory, ThreadManager } from './thread-manager'
import type { WorkerMessageEvent, ThreadManagerOptions, ThreadManagerOptionsMain, WorkerLike } from './thread-manager'
import { type CommandPayloadMap, type MessageEventData, createMessage, type SpawnThreadPayload } from './command'
import { createInstanceProxy } from './proxy'

/** @public */
export interface WASIInstance {
  readonly wasiImport?: Record<string, any>
  initialize (instance: object): void
  start (instance: object): number
  getImportObject? (): any
}

/** @public */
export interface BaseOptions {
  wasi: WASIInstance
  version?: 'preview1'
  wasm64?: boolean
}

/** @public */
export interface MainThreadBaseOptions extends BaseOptions {
  waitThreadStart?: boolean | number
}

/** @public */
export interface MainThreadOptionsWithThreadManager extends MainThreadBaseOptions {
  threadManager?: ThreadManager | (() => ThreadManager)
}

/** @public */
export interface MainThreadOptionsCreateThreadManager extends MainThreadBaseOptions, ThreadManagerOptionsMain {}

/** @public */
export type MainThreadOptions = MainThreadOptionsWithThreadManager | MainThreadOptionsCreateThreadManager

/** @public */
export interface ChildThreadOptions extends BaseOptions {
  childThread: true
  postMessage?: (data: any) => void
}

/** @public */
export type WASIThreadsOptions = MainThreadOptions | ChildThreadOptions

/** @public */
export interface WASIThreadsImports {
  'thread-spawn': (startArg: number, errorOrTid?: number) => number
}

/** @public */
export interface StartResult {
  exitCode: number
  instance: WebAssembly.Instance
}

const patchedWasiInstances = new WeakMap<WASIThreads, WeakSet<WASIInstance>>()

/** @public */
export class WASIThreads {
  public PThread: ThreadManager | undefined
  private wasmMemory!: WebAssembly.Memory
  private wasmInstance!: WebAssembly.Instance

  private readonly threadSpawn: (startArg: number, errorOrTid?: number) => number
  public readonly childThread: boolean
  private readonly postMessage: ((message: any) => void) | undefined
  public readonly wasi: WASIInstance

  public constructor (options: WASIThreadsOptions) {
    if (!options) {
      throw new TypeError('WASIThreads(): options is not provided')
    }

    if (!options.wasi) {
      throw new TypeError('WASIThreads(): options.wasi is not provided')
    }

    patchedWasiInstances.set(this, new WeakSet())

    const wasi = options.wasi
    patchWasiInstance(this, wasi)
    this.wasi = wasi

    if ('childThread' in options) {
      this.childThread = Boolean(options.childThread)
    } else {
      this.childThread = false
    }

    this.PThread = undefined
    if ('threadManager' in options) {
      if (typeof options.threadManager === 'function') {
        this.PThread = options.threadManager()
      } else {
        this.PThread = options.threadManager
      }
    } else {
      if (!this.childThread) {
        this.PThread = new ThreadManager(options as ThreadManagerOptions)
        this.PThread.init()
      }
    }

    let waitThreadStart: boolean | number = false
    if ('waitThreadStart' in options) {
      waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart)
    }

    const postMessage = getPostMessage(options as ChildThreadOptions)
    if (this.childThread && typeof postMessage !== 'function') {
      throw new TypeError('options.postMessage is not a function')
    }
    this.postMessage = postMessage

    const wasm64 = Boolean(options.wasm64)

    const onMessage = (e: WorkerMessageEvent<MessageEventData<keyof CommandPayloadMap>>): void => {
      if (e.data.__emnapi__) {
        const type = e.data.__emnapi__.type
        const payload = e.data.__emnapi__.payload
        if (type === 'spawn-thread') {
          threadSpawn(
            (payload as SpawnThreadPayload).startArg,
            (payload as SpawnThreadPayload).errorOrTid
          )
        } else if (type === 'terminate-all-threads') {
          this.terminateAllThreads()
        }
      }
    }

    const threadSpawn = (startArg: number, errorOrTid?: number): number => {
      const EAGAIN = 6
      const isNewABI = errorOrTid !== undefined

      try {
        checkSharedWasmMemory(this.wasmMemory)
      } catch (err) {
        this.PThread?.printErr(err.stack)
        if (isNewABI) {
          const struct = new Int32Array(this.wasmMemory.buffer, errorOrTid!, 2)
          Atomics.store(struct, 0, 1)
          Atomics.store(struct, 1, EAGAIN)
          Atomics.notify(struct, 1)
          return 1
        } else {
          return -EAGAIN
        }
      }

      if (!isNewABI) {
        const malloc = this.wasmInstance.exports.malloc as (size: number | bigint) => (number | bigint)
        errorOrTid = wasm64 ? Number(malloc(BigInt(8))) : malloc(8) as number
        if (!errorOrTid) {
          return -48 /* ENOMEM */
        }
      }
      const _free = this.wasmInstance.exports.free as (ptr: number | bigint) => void
      const free = wasm64 ? (ptr: number) => { _free(BigInt(ptr)) } : _free
      const struct = new Int32Array(this.wasmMemory.buffer, errorOrTid!, 2)
      Atomics.store(struct, 0, 0)
      Atomics.store(struct, 1, 0)

      if (this.childThread) {
        postMessage!(createMessage('spawn-thread', {
          startArg,
          errorOrTid: errorOrTid!
        }))
        Atomics.wait(struct, 1, 0)
        const isError = Atomics.load(struct, 0)
        const result = Atomics.load(struct, 1)
        if (isNewABI) {
          return isError
        }
        free(errorOrTid!)
        return isError ? -result : result
      }

      const shouldWait = waitThreadStart || (waitThreadStart === 0)

      let sab: Int32Array | undefined
      if (shouldWait) {
        sab = new Int32Array(new SharedArrayBuffer(16 + 8192))
        Atomics.store(sab, 0, 0)
      }

      let worker: WorkerLike | undefined
      let tid: number
      const PThread = this.PThread
      try {
        worker = PThread!.getNewWorker(sab)
        if (!worker) {
          throw new Error('failed to get new worker')
        }
        PThread!.addMessageEventListener(worker, onMessage)

        tid = PThread!.markId(worker)
        if (ENVIRONMENT_IS_NODE) {
          (worker as Worker).unref()
        }
        worker.postMessage(createMessage('start', {
          tid,
          arg: startArg,
          sab
        }))
        if (shouldWait) {
          if (typeof waitThreadStart === 'number') {
            const waitResult = Atomics.wait(sab!, 0, 0, waitThreadStart)
            if (waitResult === 'timed-out') {
              try {
                PThread!.cleanThread(worker, tid, true)
              } catch (_) {}
              throw new Error('Spawning thread timed out. Please check if the worker is created successfully and if message is handled properly in the worker.')
            }
          } else {
            Atomics.wait(sab!, 0, 0)
          }
          const r = Atomics.load(sab!, 0)
          if (r > 1) {
            try {
              PThread!.cleanThread(worker, tid, true)
            } catch (_) {}
            throw deserizeErrorFromBuffer(sab!.buffer as SharedArrayBuffer)!
          }
        }
      } catch (e) {
        Atomics.store(struct, 0, 1)
        Atomics.store(struct, 1, EAGAIN)
        Atomics.notify(struct, 1)

        PThread?.printErr(e.stack)
        if (isNewABI) {
          return 1
        }
        free(errorOrTid!)
        return -EAGAIN
      }

      Atomics.store(struct, 0, 0)
      Atomics.store(struct, 1, tid)
      Atomics.notify(struct, 1)

      PThread!.runningWorkers.push(worker)
      if (!shouldWait) {
        worker.whenLoaded!.catch((err: any) => {
          delete worker.whenLoaded
          PThread!.cleanThread(worker, tid, true)
          throw err
        })
      }

      if (isNewABI) {
        return 0
      }
      free(errorOrTid!)
      return tid
    }

    this.threadSpawn = threadSpawn
  }

  public getImportObject (): { wasi: WASIThreadsImports } {
    return {
      wasi: {
        'thread-spawn': this.threadSpawn
      }
    }
  }

  public setup (wasmInstance: WebAssembly.Instance, wasmModule: WebAssembly.Module, wasmMemory?: WebAssembly.Memory): void {
    wasmMemory ??= wasmInstance.exports.memory as WebAssembly.Memory
    this.wasmInstance = wasmInstance
    this.wasmMemory = wasmMemory
    if (this.PThread) {
      this.PThread.setup(wasmModule, wasmMemory)
    }
  }

  public preloadWorkers (): Promise<WorkerLike[]> {
    if (this.PThread) {
      return this.PThread.preloadWorkers()
    }
    return Promise.resolve([])
  }

  /**
   * It's ok to call this method to a WASI command module.
   *
   * in child thread, must call this method instead of {@link WASIThreads.start} even if it's a WASI command module
   *
   * @returns A proxied WebAssembly instance if in child thread, other wise the original instance
   */
  public initialize (instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): WebAssembly.Instance {
    const exports = instance.exports
    memory ??= exports.memory as WebAssembly.Memory
    if (this.childThread) {
      instance = createInstanceProxy(instance, memory)
    }
    this!.setup(instance, module, memory)
    const wasi = this.wasi
    if (('_start' in exports) && (typeof exports._start === 'function')) {
      if (this.childThread) {
        wasi.start(instance)
        try {
          const kStarted = getWasiSymbol(wasi, 'kStarted');
          (wasi as any)[kStarted!] = false
        } catch (_) {}
      } else {
        setupInstance(wasi, instance)
      }
    } else {
      wasi.initialize(instance)
    }
    return instance
  }

  /**
   * Equivalent to calling {@link WASIThreads.initialize} and then calling {@link WASIInstance.start}
   * ```js
   * this.initialize(instance, module, memory)
   * this.wasi.start(instance)
   * ```
   */
  public start (instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): StartResult {
    const exports = instance.exports
    memory ??= exports.memory as WebAssembly.Memory
    if (this.childThread) {
      instance = createInstanceProxy(instance, memory)
    }
    this!.setup(instance, module, memory)
    const exitCode = this.wasi.start(instance)
    return { exitCode, instance }
  }

  public terminateAllThreads (): void {
    if (!this.childThread) {
      this.PThread?.terminateAllThreads()
    } else {
      this.postMessage!(createMessage('terminate-all-threads', {}))
    }
  }
}

function patchWasiInstance (wasiThreads: WASIThreads, wasi: WASIInstance): void {
  const patched = patchedWasiInstances.get(wasiThreads)!
  if (patched.has(wasi)) {
    return
  }

  const _this = wasiThreads
  const wasiImport = wasi.wasiImport
  if (wasiImport) {
    const proc_exit = wasiImport.proc_exit
    wasiImport.proc_exit = function (code: number): number {
      _this.terminateAllThreads()
      return proc_exit.call(this, code)
    }
  }
  if (!_this.childThread) {
    const start = wasi.start
    if (typeof start === 'function') {
      wasi.start = function (instance: object): number {
        try {
          return start.call(this, instance)
        } catch (err) {
          if (isTrapError(err)) {
            _this.terminateAllThreads()
          }
          throw err
        }
      }
    }
  }
  patched.add(wasi)
}

function getWasiSymbol (wasi: WASIInstance, description: string): symbol | undefined
function getWasiSymbol (wasi: WASIInstance, description: string[]): Array<symbol | undefined>
function getWasiSymbol (wasi: WASIInstance, description: string | string[]): symbol | undefined | Array<symbol | undefined> {
  const symbols = Object.getOwnPropertySymbols(wasi)
  const selectDescription = (description: string) => (s: symbol) => {
    if (s.description) {
      return s.description === description
    }
    return s.toString() === `Symbol(${description})`
  }
  if (Array.isArray(description)) {
    return description.map(d => symbols.filter(selectDescription(d))[0])
  }
  return symbols.filter(selectDescription(description))[0]
}

function setupInstance (wasi: WASIInstance, instance: WebAssembly.Instance): void {
  const [kInstance, kSetMemory] = getWasiSymbol(wasi, ['kInstance', 'kSetMemory']);

  (wasi as any)[kInstance!] = instance;
  (wasi as any)[kSetMemory!](instance.exports.memory)
}
