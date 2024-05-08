import type { Worker as NodeWorker } from 'worker_threads'

export const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'

/** @public */
export type WorkerLike = (Worker | NodeWorker) & {
  whenLoaded?: Promise<WorkerLike>
  loaded?: boolean
  __emnapi_tid?: number
}

/** @public */
export interface WorkerMessageEvent<T = any> {
  data: T
}

/** @public */
export interface ThreadManagerOptions {
  printErr?: (message: string) => void
  beforeLoad?: (worker: WorkerLike) => any
  reuseWorker?: boolean
  onCreateWorker?: (ctx: { type: string; name: string }) => WorkerLike
}

const WASI_THREADS_MAX_TID = 0x1FFFFFFF

export function checkSharedWasmMemory (wasmMemory?: WebAssembly.Memory | null): void {
  if (typeof SharedArrayBuffer === 'undefined' || (wasmMemory && !(wasmMemory.buffer instanceof SharedArrayBuffer))) {
    throw new Error(
      'Multithread features require shared wasm memory. ' +
      'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking'
    )
  }
}

/** @public */
export class ThreadManager {
  public unusedWorkers: WorkerLike[] = []
  public runningWorkers: WorkerLike[] = []
  public pthreads: Record<number, WorkerLike> = Object.create(null)
  public nextWorkerID = 0

  /** @internal */
  public _options: ThreadManagerOptions

  public wasmModule: WebAssembly.Module | null = null
  public wasmMemory: WebAssembly.Memory | null = null
  private readonly messageEvents = new WeakMap<WorkerLike, Set<(e: WorkerMessageEvent) => void>>()

  public constructor (options?: ThreadManagerOptions) {
    this._options = Object.assign({}, options)
  }

  public init (): void {}

  public setup (wasmModule: WebAssembly.Module, wasmMemory: WebAssembly.Memory): void {
    this.wasmModule = wasmModule
    this.wasmMemory = wasmMemory
  }

  public markId (worker: WorkerLike): number {
    if (worker.__emnapi_tid) return worker.__emnapi_tid
    const tid = this.nextWorkerID + 43
    this.nextWorkerID = (this.nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42)
    this.pthreads[tid] = worker
    worker.__emnapi_tid = tid
    return tid
  }

  public returnWorkerToPool (worker: any): void {
    var tid = worker.__emnapi_tid
    delete this.pthreads[tid]
    this.unusedWorkers.push(worker)
    this.runningWorkers.splice(this.runningWorkers.indexOf(worker), 1)
    delete worker.__emnapi_tid
    if (ENVIRONMENT_IS_NODE) {
      worker.unref()
    }
  }

  public loadWasmModuleToWorker (worker: WorkerLike, sab?: Int32Array): Promise<WorkerLike> {
    if (worker.whenLoaded) return worker.whenLoaded
    const err = this._options.printErr
    const beforeLoad = this._options.beforeLoad
    worker.whenLoaded = new Promise<WorkerLike>((resolve, reject) => {
      const handleError = function (e: { message: string }): void {
        const message = 'worker sent an error!'
        // if (worker.pthread_ptr) {
        //   message = 'Pthread ' + ptrToString(worker.pthread_ptr) + ' sent an error!'
        // }
        err?.(message + ' ' + e.message)
        reject(e)
        throw e as Error
      }
      const handleMessage = (data: any): void => {
        if (data.__emnapi__) {
          const type = data.__emnapi__.type
          const payload = data.__emnapi__.payload
          if (type === 'loaded') {
            worker.loaded = true
            if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
              (worker as NodeWorker).unref()
            }
            resolve(worker)
            // if (payload.err) {
            //   err('failed to load in child thread: ' + (payload.err.message || payload.err))
            // }
          } else if (type === 'cleanup-thread') {
            this.cleanThread(worker, payload.tid)
          }
        }
      };
      (worker as Worker).onmessage = (e) => {
        handleMessage(e.data)

        this.fireMessageEvent(worker, e)
      };
      (worker as Worker).onerror = handleError
      if (ENVIRONMENT_IS_NODE) {
        (worker as NodeWorker).on('message', function (data: any) {
          (worker as any).onmessage?.({
            data
          })
        });
        (worker as NodeWorker).on('error', function (e) {
          (worker as any).onerror?.(e)
        });
        (worker as NodeWorker).on('detachedExit', function () {})
      }

      beforeLoad?.(worker)

      try {
        worker.postMessage({
          __emnapi__: {
            type: 'load',
            payload: {
              wasmModule: this.wasmModule,
              wasmMemory: this.wasmMemory,
              sab
            }
          }
        })
      } catch (err) {
        checkSharedWasmMemory(this.wasmMemory)
        throw err
      }
    })
    return worker.whenLoaded
  }

  public allocateUnusedWorker (): WorkerLike {
    const onCreateWorker = this._options.onCreateWorker
    if (typeof onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not provided')
    }
    const worker = onCreateWorker({ type: 'thread', name: 'emnapi-pthread' })
    this.unusedWorkers.push(worker)
    return worker
  }

  public getNewWorker (sab?: Int32Array): WorkerLike | undefined {
    if (this._options.reuseWorker) {
      if (this.unusedWorkers.length === 0) {
        const worker = this.allocateUnusedWorker()
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.loadWasmModuleToWorker(worker, sab)
      }
      return this.unusedWorkers.pop()
    }
    const worker = this.allocateUnusedWorker()
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.loadWasmModuleToWorker(worker, sab)
    return this.unusedWorkers.pop()
  }

  public cleanThread (worker: WorkerLike, tid: number, force?: boolean): void {
    if (!force && this._options.reuseWorker) {
      this.returnWorkerToPool(worker)
    } else {
      delete this.pthreads[tid]
      const index = this.runningWorkers.indexOf(worker)
      if (index !== -1) {
        this.runningWorkers.splice(index, 1)
      }
      this.terminateWorker(worker)
      delete worker.__emnapi_tid
    }
  }

  public terminateWorker (worker: WorkerLike): void {
    const tid = worker.__emnapi_tid
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    worker.terminate()
    this.messageEvents.get(worker)?.clear()
    this.messageEvents.delete(worker);
    (worker as Worker).onmessage = (e: any) => {
      if (e.data.__emnapi__) {
        this._options.printErr?.('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid)
      }
    }
  }

  public addMessageEventListener (worker: WorkerLike, onMessage: (e: WorkerMessageEvent) => void): () => void {
    let listeners = this.messageEvents.get(worker)
    if (!listeners) {
      listeners = new Set()
      this.messageEvents.set(worker, listeners)
    }
    listeners.add(onMessage)
    return () => {
      listeners?.delete(onMessage)
    }
  }

  public fireMessageEvent (worker: WorkerLike, e: WorkerMessageEvent): void {
    const listeners = this.messageEvents.get(worker)
    if (!listeners) return
    const err = this._options.printErr
    listeners.forEach((listener) => {
      try {
        listener(e)
      } catch (e) {
        if (err) {
          err(e.message)
        } else {
          console.error(e)
        }
      }
    })
  }
}
