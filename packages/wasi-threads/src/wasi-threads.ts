import { checkSharedWasmMemory, ENVIRONMENT_IS_NODE } from './thread-manager'
import type { ThreadManager, WorkerMessageEvent } from './thread-manager'

/** @public */
export interface BaseOptions {
  version?: 'preview1'
}

/** @public */
export interface MainThreadOptions extends BaseOptions {
  threadManager: ThreadManager | (() => ThreadManager)
  waitThreadStart?: boolean
}

/** @public */
export interface ChildThreadOptions extends BaseOptions {
  postMessage: (data: any) => void
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

  private readonly waitThreadStart: boolean
  private readonly postMessage: ((data: any) => void) | undefined
  private readonly threadSpawn: (startArg: number, errorOrTid?: number) => number

  public constructor (options: WASIThreadsOptions) {
    if ('threadManager' in options) {
      if (typeof options.threadManager === 'function') {
        this.PThread = options.threadManager()
      } else {
        this.PThread = options.threadManager
      }
    }

    if ('waitThreadStart' in options) {
      this.waitThreadStart = Boolean(options.waitThreadStart)
    } else {
      this.waitThreadStart = false
    }

    if ('postMessage' in options) {
      if (typeof options.postMessage !== 'function') {
        throw new TypeError('options.postMessage is not a function')
      }
      this.postMessage = postMessage
    } else {
      this.postMessage = undefined
    }

    const onSpawn = (e: WorkerMessageEvent): void => {
      if (e.data.__emnapi__) {
        const type = e.data.__emnapi__.type
        const payload = e.data.__emnapi__.payload
        if (type === 'spawn-thread') {
          threadSpawn(payload.startArg, payload.errorOrTid)
        }
      }
    }

    const threadSpawn = (startArg: number, errorOrTid?: number): number => {
      checkSharedWasmMemory(this.wasmMemory)

      const isNewABI = errorOrTid !== undefined
      if (!isNewABI) {
        const malloc = this.wasmInstance.exports.malloc as Function
        errorOrTid = malloc(8)
        if (!errorOrTid) {
          return -48 /* ENOMEM */
        }
      }
      const free = this.wasmInstance.exports.free as Function
      const struct = new Int32Array(this.wasmMemory.buffer, errorOrTid!, 2)
      Atomics.store(struct, 0, 0)
      Atomics.store(struct, 1, 0)

      if (this.postMessage) {
        const postMessage = this.postMessage
        postMessage({
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

      let sab: Int32Array | undefined
      if (this.waitThreadStart) {
        sab = new Int32Array(new SharedArrayBuffer(4))
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
        if (this.waitThreadStart) {
          Atomics.wait(sab!, 0, 0)
          const r = Atomics.load(sab!, 0)
          if (r === 2) {
            throw new Error('failed to start pthread')
          }
        }
      } catch (e) {
        const EAGAIN = 6

        Atomics.store(struct, 0, 1)
        Atomics.store(struct, 1, EAGAIN)
        Atomics.notify(struct, 1)

        PThread?._options.err?.(e.message)
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
      if (!this.waitThreadStart) {
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
}
