import {
  ThreadMessageHandler,
  type ThreadMessageHandlerOptions,
  type InstantiatePayload
} from '@emnapi/wasi-threads'
import type { NapiModule } from './emnapi/index'
import type { InstantiatedSource } from './load'

export type { ThreadMessageHandlerOptions, InstantiatePayload }

/** @public */
export interface MessageHandlerOptions extends ThreadMessageHandlerOptions {
  onLoad: (data: InstantiatePayload) => InstantiatedSource | PromiseLike<InstantiatedSource>
}

/** @public */
export class MessageHandler extends ThreadMessageHandler {
  public napiModule: NapiModule | undefined

  public constructor (options: MessageHandlerOptions) {
    if (typeof options.onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    super(options)
    this.napiModule = undefined
  }

  public override instantiate (data: InstantiatePayload): InstantiatedSource | PromiseLike<InstantiatedSource> {
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

  public override handle (e: any): void {
    super.handle(e)
    if (e?.data?.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload

      if (type === 'async-worker-init') {
        this.handleAfterLoad(e, () => {
          this.napiModule!.initWorker(payload.arg)
        })
      } else if (type === 'async-work-execute') {
        this.handleAfterLoad(e, () => {
          this.napiModule!.executeAsyncWork(payload.work)
        })
      }
    }
  }
}
