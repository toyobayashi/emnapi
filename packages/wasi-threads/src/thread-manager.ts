import type { Worker as NodeWorker } from 'worker_threads'
import { deserializeError, ENVIRONMENT_IS_NODE, isSharedArrayBuffer, normalizeError } from './util'
import {
  type MessageEventData,
  createMessage,
  type CommandPayloadMap,
  type CleanupThreadPayload,
  type SpawnThreadPayload,
  type ThreadErrorPayload
} from './command'

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
export type WorkerFactory = (ctx: { type: string; name: string }) => WorkerLike

/** @public */
export interface ReuseWorkerOptions {
  /**
   * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size | PTHREAD_POOL_SIZE}
   */
  size: number

  /**
   * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size-strict | PTHREAD_POOL_SIZE_STRICT}
   */
  strict?: boolean
}

/** @public */
export type ThreadManagerOptions = ThreadManagerOptionsMain | ThreadManagerOptionsChild

/** @public */
export interface ThreadManagerOptionsBase {
  printErr?: (message: string) => void
  threadSpawn?: (startArg: number, errorOrTid?: number) => number
}

/** @public */
export interface ThreadManagerOptionsMain extends ThreadManagerOptionsBase {
  beforeLoad?: (worker: WorkerLike) => any
  reuseWorker?: boolean | number | ReuseWorkerOptions
  onCreateWorker: WorkerFactory
  childThread?: false
}

/** @public */
export interface ThreadManagerOptionsChild extends ThreadManagerOptionsBase {
  childThread: true
}

const WASI_THREADS_MAX_TID = 0x1FFFFFFF

export function checkSharedWasmMemory (wasmMemory?: WebAssembly.Memory | null): void {
  if (wasmMemory) {
    if (!isSharedArrayBuffer(wasmMemory.buffer)) {
      throw new Error(
        'Multithread features require shared wasm memory. ' +
        'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking, ' +
        'then create WebAssembly.Memory with `shared: true` option'
      )
    }
  } else {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error('Current environment does not support SharedArrayBuffer, threads are not available!')
    }
  }
}

function getReuseWorker (value?: boolean | number | ReuseWorkerOptions): false | Required<ReuseWorkerOptions> {
  if (typeof value === 'boolean') {
    return value ? { size: 0, strict: false } : false
  }
  if (typeof value === 'number') {
    if (!(value >= 0)) {
      throw new RangeError('reuseWorker: size must be a non-negative integer')
    }
    return { size: value, strict: false }
  }
  if (!value) {
    return false
  }
  const size = Number(value.size) || 0
  const strict = Boolean(value.strict)
  if (!(size > 0) && strict) {
    throw new RangeError('reuseWorker: size must be set to positive integer if strict is set to true')
  }
  return { size, strict }
}

let nextWorkerID = 0

/** @public */
export class ThreadManager {
  public unusedWorkers: WorkerLike[] = []
  public pthreads: Record<number, WorkerLike> = Object.create(null)
  public get nextWorkerID (): number { return nextWorkerID }

  public wasmModule: WebAssembly.Module | null = null
  public wasmMemory: WebAssembly.Memory | null = null
  private readonly messageEvents = new WeakMap<WorkerLike, Set<(e: WorkerMessageEvent) => void>>()
  private readonly registeredWorkers = new Set<WorkerLike>()
  private readonly expectedTerminations = new WeakSet<WorkerLike>()
  private readonly loadRejects = new WeakMap<WorkerLike, (reason?: any) => void>()
  private _fatalError: Error | undefined

  private readonly _childThread: boolean
  private readonly _onCreateWorker: WorkerFactory
  private readonly _reuseWorker: false | Required<ReuseWorkerOptions>
  private readonly _beforeLoad?: (worker: WorkerLike) => any

  /** @internal */
  public readonly printErr: (message: string) => void

  public threadSpawn?: ((startArg: number, errorOrTid?: number) => number)

  public constructor (options: ThreadManagerOptions) {
    if (!options) {
      throw new TypeError('ThreadManager(): options is not provided')
    }

    if ('childThread' in options) {
      this._childThread = Boolean(options.childThread)
    } else {
      this._childThread = false
    }

    if (this._childThread) {
      this._onCreateWorker = undefined!
      this._reuseWorker = false
      this._beforeLoad = undefined!
    } else {
      this._onCreateWorker = (options as ThreadManagerOptionsMain).onCreateWorker
      this._reuseWorker = getReuseWorker((options as ThreadManagerOptionsMain).reuseWorker)
      this._beforeLoad = (options as ThreadManagerOptionsMain).beforeLoad
    }

    this.printErr = options.printErr ?? console.error.bind(console)
    this.threadSpawn = options.threadSpawn
  }

  public init (): void {
    if (!this._childThread) {
      this.initMainThread()
    }
  }

  public initMainThread (): void {
    this.preparePool()
  }

  private preparePool (): void {
    if (this._reuseWorker) {
      if (this._reuseWorker.size) {
        let pthreadPoolSize = this._reuseWorker.size
        while (pthreadPoolSize--) {
          const worker = this.allocateUnusedWorker()
          if (ENVIRONMENT_IS_NODE) {
            // https://github.com/nodejs/node/issues/53036
            (worker as NodeWorker).once('message', () => {});
            (worker as NodeWorker).unref()
          }
        }
      }
    }
  }

  public shouldPreloadWorkers (): boolean {
    return !this._childThread && this._reuseWorker && this._reuseWorker.size > 0
  }

  public loadWasmModuleToAllWorkers (): Promise<WorkerLike[]> {
    const promises: Array<Promise<WorkerLike>> = Array(this.unusedWorkers.length)
    for (let i = 0; i < this.unusedWorkers.length; ++i) {
      const worker = this.unusedWorkers[i]
      if (ENVIRONMENT_IS_NODE) (worker as NodeWorker).ref()
      promises[i] = this.loadWasmModuleToWorker(worker).then(
        (w) => {
          if (ENVIRONMENT_IS_NODE) (worker as NodeWorker).unref()
          return w
        },
        (e) => {
          if (ENVIRONMENT_IS_NODE) (worker as NodeWorker).unref()
          throw e
        }
      )
    }
    return Promise.all(promises).catch((err) => {
      this.terminateAllThreads()
      throw err
    })
  }

  public preloadWorkers (): Promise<WorkerLike[]> {
    if (this.shouldPreloadWorkers()) {
      return this.loadWasmModuleToAllWorkers()
    }
    return Promise.resolve([])
  }

  public setup (wasmModule: WebAssembly.Module, wasmMemory: WebAssembly.Memory): void {
    this.wasmModule = wasmModule
    this.wasmMemory = wasmMemory
  }

  private assertRunning (): void {
    if (this._fatalError) throw this._fatalError
  }

  private fail (value: unknown): void {
    if (this._fatalError) return
    this._fatalError = normalizeError(value)
    this.shutdownAllWorkers(false, this._fatalError)
    const error = this._fatalError
    Promise.resolve().then(() => { throw error })
  }

  public markId (worker: WorkerLike): number {
    this.assertRunning()
    if (worker.__emnapi_tid) return worker.__emnapi_tid
    const tid = nextWorkerID + 43
    nextWorkerID = (nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42)
    this.pthreads[tid] = worker
    worker.__emnapi_tid = tid
    return tid
  }

  public returnWorkerToPool (worker: WorkerLike): void {
    if (this._fatalError) {
      this.terminateWorker(worker)
      return
    }
    var tid = worker.__emnapi_tid
    if (tid !== undefined) {
      delete this.pthreads[tid]
    }
    this.unusedWorkers.push(worker)
    delete worker.__emnapi_tid
    if (ENVIRONMENT_IS_NODE) {
      (worker as NodeWorker).unref()
    }
  }

  public loadWasmModuleToWorker (worker: WorkerLike, sab?: Int32Array): Promise<WorkerLike> {
    this.assertRunning()
    if (worker.whenLoaded) return worker.whenLoaded
    this.registeredWorkers.add(worker)
    const err = this.printErr
    const beforeLoad = this._beforeLoad
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    worker.whenLoaded = new Promise<WorkerLike>((resolve, reject) => {
      const handleError = function (e: Event | Error): void {
        if (_this.expectedTerminations.has(worker)) return
        let message = 'worker sent an error!'
        if (worker.__emnapi_tid !== undefined) {
          message = 'worker (tid = ' + worker.__emnapi_tid + ') sent an error!'
        }
        const error = normalizeError(e)
        if (error.message) {
          err(message + ' ' + error.message)
        } else {
          err(message)
        }
        if (!worker.loaded) {
          reject(error)
          _this.loadRejects.delete(worker)
          _this.terminateWorker(worker)
          return
        }
        _this.fail(error)
      }
      const handleMessage = (data: MessageEventData<keyof CommandPayloadMap>): void => {
        if (data.__emnapi__) {
          const type = data.__emnapi__.type
          const payload = data.__emnapi__.payload
          if (type === 'loaded') {
            worker.loaded = true
            this.loadRejects.delete(worker)
            if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
              (worker as NodeWorker).unref()
            }
            resolve(worker)
            // if (payload.err) {
            //   err('failed to load in child thread: ' + (payload.err.message || payload.err))
            // }
          } else if (type === 'cleanup-thread') {
            if ((payload as CleanupThreadPayload).tid in this.pthreads) {
              this.cleanThread(worker, (payload as CleanupThreadPayload).tid)
            }
          } else if (type === 'spawn-thread') {
            this.threadSpawn!(
              (payload as SpawnThreadPayload).startArg,
              (payload as SpawnThreadPayload).errorOrTid
            )
          } else if (type === 'terminate-all-threads') {
            this.terminateAllThreads()
          } else if (type === 'thread-error') {
            const threadError = payload as ThreadErrorPayload
            const error = deserializeError(threadError.error)
            if (!worker.loaded && threadError.phase === 'load') {
              reject(error)
              this.loadRejects.delete(worker)
              this.terminateWorker(worker)
            } else {
              this.fail(error)
            }
          }
        }
      };
      (worker as Worker).onmessage = (e) => {
        handleMessage(e.data)

        this.fireMessageEvent(worker, e)
      };
      (worker as Worker).onerror = handleError
      ;(worker as Worker).onmessageerror = (e) => {
        handleError(normalizeError(e))
      }
      if (ENVIRONMENT_IS_NODE) {
        (worker as NodeWorker).on('message', function (data: any) {
          (worker as any).onmessage?.({
            data
          })
        });
        (worker as NodeWorker).on('error', function (e) {
          (worker as any).onerror?.(e)
        });
        (worker as NodeWorker).on('messageerror', function (e) {
          handleError(normalizeError(e))
        });
        (worker as NodeWorker).on('exit', function (code) {
          if (!_this.expectedTerminations.has(worker)) {
            handleError(new Error('Worker stopped with exit code ' + code))
          }
        });
        (worker as NodeWorker).on('detachedExit', function () {})
      }

      this.loadRejects.set(worker, reject)

      try {
        if (typeof beforeLoad === 'function') {
          beforeLoad(worker)
        }
        worker.postMessage(createMessage('load', {
          wasmModule: this.wasmModule!,
          wasmMemory: this.wasmMemory!,
          sab
        }))
      } catch (caughtError) {
        let error = caughtError
        try {
          checkSharedWasmMemory(this.wasmMemory)
        } catch (memoryError) {
          error = memoryError
        }
        reject(error)
        this.loadRejects.delete(worker)
        this.terminateWorker(worker)
      }
    })
    return worker.whenLoaded
  }

  public allocateUnusedWorker (): WorkerLike {
    this.assertRunning()
    const _onCreateWorker = this._onCreateWorker
    if (typeof _onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not provided')
    }
    const worker = _onCreateWorker({ type: 'thread', name: 'emnapi-pthread' })
    this.registeredWorkers.add(worker)
    this.unusedWorkers.push(worker)
    return worker
  }

  public getNewWorker (sab?: Int32Array): WorkerLike | undefined {
    this.assertRunning()
    if (this._reuseWorker) {
      if (this.unusedWorkers.length === 0) {
        if (this._reuseWorker.strict) {
          if (!ENVIRONMENT_IS_NODE) {
            const err = this.printErr
            err('Tried to spawn a new thread, but the thread pool is exhausted.\n' +
              'This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.')
            return
          }
        }
        const worker = this.allocateUnusedWorker()

        this.loadWasmModuleToWorker(worker, sab)
      }
      return this.unusedWorkers.pop()
    }
    const worker = this.allocateUnusedWorker()

    this.loadWasmModuleToWorker(worker, sab)
    return this.unusedWorkers.pop()
  }

  public cleanThread (worker: WorkerLike, tid: number, force?: boolean): void {
    if (!force && this._reuseWorker) {
      this.returnWorkerToPool(worker)
    } else {
      delete this.pthreads[tid]
      this.terminateWorker(worker)
      delete worker.__emnapi_tid
    }
  }

  public terminateWorker (worker: WorkerLike): void {
    const tid = worker.__emnapi_tid

    this.expectedTerminations.add(worker)
    this.registeredWorkers.delete(worker)
    this.loadRejects.delete(worker)
    worker.terminate()
    this.messageEvents.get(worker)?.clear()
    this.messageEvents.delete(worker);
    (worker as Worker).onmessage = (e: any) => {
      if (e.data.__emnapi__) {
        const err = this.printErr
        err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid)
      }
    }
  }

  public terminateAllThreads (): void {
    this.shutdownAllWorkers(true)
  }

  private shutdownAllWorkers (recreatePool: boolean, reason?: Error): void {
    const workers = new Set<WorkerLike>([
      ...this.registeredWorkers,
      ...Object.values(this.pthreads),
      ...this.unusedWorkers
    ])
    workers.forEach((worker) => {
      if (reason) this.loadRejects.get(worker)?.(reason)
      this.terminateWorker(worker)
    })
    this.unusedWorkers = []
    this.pthreads = Object.create(null)

    if (recreatePool && !this._fatalError) this.preparePool()
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
    const err = this.printErr
    listeners.forEach((listener) => {
      try {
        listener(e)
      } catch (e) {
        err(e.stack)
      }
    })
  }
}
