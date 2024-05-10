import { ENVIRONMENT_IS_NODE, deserizeErrorFromBuffer, getPostMessage } from './util'
import { checkSharedWasmMemory, ThreadManager } from './thread-manager'
import type { WorkerMessageEvent, ThreadManagerOptions } from './thread-manager'

/** @public */
export interface WASIInstance {
  readonly wasiImport?: Record<string, any>
  initialize (instance: object): void
  start (instance: object): void
  getImportObject? (): any
}

/** @public */
export interface BaseOptions {
  version?: 'preview1'
  wasm64?: boolean
}

/** @public */
export interface MainThreadBaseOptions extends BaseOptions {
  waitThreadStart?: boolean | number
}

/** @public */
export interface MainThreadOptionsWithThreadManager extends MainThreadBaseOptions {
  threadManager: ThreadManager | (() => ThreadManager)
}

/** @public */
export interface MainThreadOptionsCreateThreadManager extends MainThreadBaseOptions, ThreadManagerOptions {}

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
export class WASIThreads {
  public PThread: ThreadManager | undefined
  private wasmMemory!: WebAssembly.Memory
  private wasmInstance!: WebAssembly.Instance

  private readonly threadSpawn: (startArg: number, errorOrTid?: number) => number
  private readonly childThread: boolean
  private readonly postMessage: ((message: any) => void) | undefined

  public constructor (options: WASIThreadsOptions) {
    if (!options) {
      throw new TypeError('options is not provided')
    }

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

    const onSpawn = (e: WorkerMessageEvent): void => {
      if (e.data.__emnapi__) {
        const type = e.data.__emnapi__.type
        const payload = e.data.__emnapi__.payload
        if (type === 'spawn-thread') {
          threadSpawn(payload.startArg, payload.errorOrTid)
        } else if (type === 'terminate-all-threads') {
          this.terminateAllThreads()
        }
      }
    }

    const threadSpawn = (startArg: number, errorOrTid?: number): number => {
      checkSharedWasmMemory(this.wasmMemory)

      const isNewABI = errorOrTid !== undefined
      if (!isNewABI) {
        const malloc = this.wasmInstance.exports.malloc as Function
        errorOrTid = wasm64 ? Number(malloc(BigInt(8))) : malloc(8)
        if (!errorOrTid) {
          return -48 /* ENOMEM */
        }
      }
      const _free = this.wasmInstance.exports.free as Function
      const free = wasm64 ? (ptr: number) => { _free(BigInt(ptr)) } : _free
      const struct = new Int32Array(this.wasmMemory.buffer, errorOrTid!, 2)
      Atomics.store(struct, 0, 0)
      Atomics.store(struct, 1, 0)

      if (this.childThread) {
        postMessage!({
          __emnapi__: {
            type: 'spawn-thread',
            payload: {
              startArg,
              errorOrTid: errorOrTid!
            }
          }
        })
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

      let worker: any
      let tid: number
      const PThread = this.PThread
      try {
        worker = PThread!.getNewWorker(sab)
        if (!worker) {
          throw new Error('failed to get new worker')
        }
        PThread!.addMessageEventListener(worker, onSpawn)

        tid = PThread!.markId(worker)
        if (ENVIRONMENT_IS_NODE) {
          worker.ref()
        }
        worker.postMessage({
          __emnapi__: {
            type: 'start',
            payload: {
              tid,
              arg: startArg,
              sab
            }
          }
        })
        if (shouldWait) {
          if (typeof waitThreadStart === 'number') {
            const waitResult = Atomics.wait(sab!, 0, 0, waitThreadStart)
            if (waitResult === 'timed-out') {
              throw new Error('Spawning thread timed out. Please check if the worker is created successfully and if message is handled properly in the worker.')
            }
          } else {
            Atomics.wait(sab!, 0, 0)
          }
          const r = Atomics.load(sab!, 0)
          if (r > 1) {
            throw deserizeErrorFromBuffer(sab!.buffer as SharedArrayBuffer)!
          }
        }
      } catch (e) {
        const EAGAIN = 6

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
        worker.whenLoaded.catch((err: any) => {
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

  public setup (wasmInstance: WebAssembly.Instance, wasmModule: WebAssembly.Module, wasmMemory: WebAssembly.Memory): void {
    this.wasmInstance = wasmInstance
    this.wasmMemory = wasmMemory
    if (this.PThread) {
      this.PThread.setup(wasmModule, wasmMemory)
    }
  }

  public patchWasiInstance<T extends WASIInstance> (wasi: T): T {
    if (!wasi) return wasi
    const wasiImport = wasi.wasiImport
    if (wasiImport) {
      const proc_exit = wasiImport.proc_exit
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const _this = this
      wasiImport.proc_exit = function (code: number): number {
        _this.terminateAllThreads()
        return proc_exit.call(this, code)
      }
    }
    return wasi
  }

  public terminateAllThreads (): void {
    if (!this.childThread) {
      this.PThread?.terminateAllThreads()
    } else {
      this.postMessage!({
        __emnapi__: {
          type: 'terminate-all-threads'
        }
      })
    }
  }
}
