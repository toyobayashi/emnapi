import {
  ThreadMessageHandler,
  type ThreadMessageHandlerOptions,
  type LoadPayload,
  type WorkerMessageEvent,
  type WorkerMessageType
} from '@emnapi/wasi-threads'
import type { AddonModule, NapiModule } from './emnapi/index'
import type { InstantiatedAddonSource, InstantiatedSource } from './load'

export type { ThreadMessageHandlerOptions, LoadPayload }

/** @public */
export interface MessageHandlerOptions extends ThreadMessageHandlerOptions {
  onLoad: (data: LoadPayload) => InstantiatedAddonSource | InstantiatedSource | PromiseLike<InstantiatedAddonSource | InstantiatedSource>
}

/** @public */
export class MessageHandler extends ThreadMessageHandler {
  public addonModule: AddonModule | undefined
  /** @deprecated Use addonModule instead. This property will be removed in 2.0.0-rc. */
  public napiModule: NapiModule | undefined

  public constructor (options: MessageHandlerOptions) {
    if (typeof options.onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    const userOnError = options.onError
    super({
      ...options,
      onError: (err, type) => {
        if (typeof userOnError === 'function') {
          userOnError(err, type)
        } else {
          throw err
        }
      }
    })
    this.addonModule = undefined
    this.napiModule = undefined
  }

  protected override beforeReportError (_error: Error, _type: WorkerMessageType | 'async-worker-init'): void {
    const emnapi_thread_crashed = this.instance?.exports.emnapi_thread_crashed as () => void
    if (typeof emnapi_thread_crashed === 'function') {
      emnapi_thread_crashed()
    } /* else {
      tryWakeUpPthreadJoin(this.instance!)
    } */
  }

  public override instantiate (data: LoadPayload): InstantiatedAddonSource | InstantiatedSource | PromiseLike<InstantiatedAddonSource | InstantiatedSource> {
    const source = this.onLoad!(data) as InstantiatedAddonSource | InstantiatedSource | PromiseLike<InstantiatedAddonSource | InstantiatedSource>
    const then = (source as PromiseLike<InstantiatedAddonSource | InstantiatedSource>).then
    if (typeof then === 'function') {
      return (source as PromiseLike<InstantiatedAddonSource | InstantiatedSource>).then((result) => {
        this.setAddonModule(result)
        return result
      })
    }
    this.setAddonModule(source as InstantiatedAddonSource | InstantiatedSource)
    return source
  }

  private setAddonModule (source: InstantiatedAddonSource | InstantiatedSource): void {
    const addonModule = 'addonModule' in source ? source.addonModule : source.napiModule
    this.addonModule = addonModule
    this.napiModule = addonModule
  }

  public override handle (e: WorkerMessageEvent): void {
    super.handle(e)
    if (e?.data?.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload
      try {
        if (type === 'async-worker-init') {
          this.handleAfterLoad(e, () => {
            this.addonModule!.initWorker(payload.arg, payload.func)
          })
        }
      } catch (err) {
        this.reportError(err, 'async-worker-init')
      }
    }
  }
}

// function tryWakeUpPthreadJoin (instance: WebAssembly.Instance): void {
//   // https://github.com/WebAssembly/wasi-libc/blob/574b88da481569b65a237cb80daf9a2d5aeaf82d/libc-top-half/musl/src/thread/pthread_join.c#L18-L21
//   const pthread_self = instance.exports.pthread_self as () => number
//   const memory = instance.exports.memory as WebAssembly.Memory
//   if (typeof pthread_self === 'function') {
//     const selfThread = pthread_self()
//     if (selfThread && memory) {
//       // https://github.com/WebAssembly/wasi-libc/blob/574b88da481569b65a237cb80daf9a2d5aeaf82d/libc-top-half/musl/src/internal/pthread_impl.h#L45
//       const detatchState = new Int32Array(memory.buffer, selfThread + 7 * 4 /** detach_state */, 1)
//       Atomics.store(detatchState, 0, 0)
//       Atomics.notify(detatchState, 0, Infinity)
//     }
//   }
// }
