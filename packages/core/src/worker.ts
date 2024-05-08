import {
  MessageHandler as WASIThreadsMessageHandler,
  type HandleOptions,
  type OnLoadData
} from '@emnapi/wasi-threads'
import type { NapiModule } from './emnapi/index'
import type { InstantiatedSource } from './load'

export type { HandleOptions, OnLoadData }

/** @public */
export class MessageHandler extends WASIThreadsMessageHandler {
  napiModule: NapiModule | undefined

  constructor (options: HandleOptions) {
    super(options)
    this.napiModule = undefined
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

  protected override onLoadSuccess (source: InstantiatedSource): void {
    this.napiModule = source.napiModule
  }
}
