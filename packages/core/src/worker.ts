import {
  ThreadMessageHandler,
  type ThreadMessageHandlerOptions,
  type LoadPayload,
  type WorkerMessageEvent
} from '@emnapi/wasi-threads'
import type { NapiModule } from './emnapi/index'
import type { InstantiatedSource } from './load'

export type { ThreadMessageHandlerOptions, LoadPayload }

/** @public */
export interface MessageHandlerOptions extends ThreadMessageHandlerOptions {
  onLoad: (data: LoadPayload) => InstantiatedSource | PromiseLike<InstantiatedSource>
}

/** @public */
export class MessageHandler extends ThreadMessageHandler {
  public napiModule: NapiModule | undefined

  public constructor (options: MessageHandlerOptions) {
    if (typeof options.onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    const userOnError = options.onError
    super({
      ...options,
      onError: (err, type) => {
        const emnapi_thread_crashed = this.instance?.exports.emnapi_thread_crashed as () => void
        if (typeof emnapi_thread_crashed === 'function') {
          emnapi_thread_crashed()
        } /* else {
          tryWakeUpPthreadJoin(this.instance!)
        } */

        if (typeof userOnError === 'function') {
          userOnError(err, type)
        } else {
          throw err
        }
      }
    })
    this.napiModule = undefined
  }

  public override instantiate (data: LoadPayload): InstantiatedSource | PromiseLike<InstantiatedSource> {
    const source = this.onLoad!(data) as InstantiatedSource | PromiseLike<InstantiatedSource>
    const then = (source as PromiseLike<InstantiatedSource>).then
    if (typeof then === 'function') {
      return (source as PromiseLike<InstantiatedSource>).then((result) => {
        this.napiModule = result.napiModule
        return result
      })
    }
    this.napiModule = (source as InstantiatedSource).napiModule
    return source
  }

  public override handle (e: WorkerMessageEvent): void {
    super.handle(e)
    if (e?.data?.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload
      try {
        if (type === 'async-worker-init') {
          this.handleAfterLoad(e, () => {
            this.napiModule!.initWorker(payload.arg)
          })
        } else if (type === 'async-work-execute') {
          this.handleAfterLoad(e, () => {
            this.napiModule!.executeAsyncWork(payload.work)
          })
        }
      } catch (err) {
        this.onError(err, type)
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
