import type { Worker as NodeWorker } from 'worker_threads'
import { ENVIRONMENT_IS_NODE, isSharedArrayBuffer } from './util'
import { type MessageEventData, createMessage, type CommandPayloadMap, type CleanupThreadPayload, SpawnThreadPayload } from './command'

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
  public runningWorkers: WorkerLike[] = []
  public pthreads: Record<number, WorkerLike> = Object.create(null)
  public get nextWorkerID (): number { return nextWorkerID }

  public wasmModule: WebAssembly.Module | null = null
  public wasmMemory: WebAssembly.Memory | null = null
  private readonly messageEvents = new WeakMap<WorkerLike, Set<(e: WorkerMessageEvent) => void>>()

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

  public markId (worker: WorkerLike): number {
    if (worker.__emnapi_tid) return worker.__emnapi_tid
    const tid = nextWorkerID + 43
    nextWorkerID = (nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42)
    this.pthreads[tid] = worker
    worker.__emnapi_tid = tid
    return tid
  }

  public returnWorkerToPool (worker: WorkerLike): void {
    var tid = worker.__emnapi_tid
    if (tid !== undefined) {
      delete this.pthreads[tid]
    }
    this.unusedWorkers.push(worker)
    this.runningWorkers.splice(this.runningWorkers.indexOf(worker), 1)
    delete worker.__emnapi_tid
    if (ENVIRONMENT_IS_NODE) {
      (worker as NodeWorker).unref()
    }
  }

  public loadWasmModuleToWorker (worker: WorkerLike, sab?: Int32Array): Promise<WorkerLike> {
    if (worker.whenLoaded) return worker.whenLoaded
    const err = this.printErr
    const beforeLoad = this._beforeLoad
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this
    worker.whenLoaded = new Promise<WorkerLike>((resolve, reject) => {
      const handleError = function (e: Event | Error): void {
        let message = 'worker sent an error!'
        if (worker.__emnapi_tid !== undefined) {
          message = 'worker (tid = ' + worker.__emnapi_tid + ') sent an error!'
        }
        if ('message' in e) {
          err(message + ' ' + e.message)
          if (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1) {
            try {
              _this.terminateAllThreads()
            } catch (_) {}
          }
        } else {
          err(message)
        }
        reject(e)
        throw e
      }
      const handleMessage = (data: MessageEventData<keyof CommandPayloadMap>): void => {
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

      if (typeof beforeLoad === 'function') {
        beforeLoad(worker)
      }

      try {
        worker.postMessage(createMessage('load', {
          wasmModule: this.wasmModule!,
          wasmMemory: this.wasmMemory!,
          sab
        }))
      } catch (err) {
        checkSharedWasmMemory(this.wasmMemory)
        throw err
      }
    })
    return worker.whenLoaded
  }

  public allocateUnusedWorker (): WorkerLike {
    const _onCreateWorker = this._onCreateWorker
    if (typeof _onCreateWorker !== 'function') {
      throw new TypeError('`options.onCreateWorker` is not provided')
    }
    const worker = _onCreateWorker({ type: 'thread', name: 'emnapi-pthread' })
    this.unusedWorkers.push(worker)
    return worker
  }

  public getNewWorker (sab?: Int32Array): WorkerLike | undefined {
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
    for (let i = 0; i < this.runningWorkers.length; ++i) {
      this.terminateWorker(this.runningWorkers[i])
    }
    for (let i = 0; i < this.unusedWorkers.length; ++i) {
      this.terminateWorker(this.unusedWorkers[i])
    }
    this.unusedWorkers = []
    this.runningWorkers = []
    this.pthreads = Object.create(null)

    this.preparePool()
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
