import type { NapiModule } from './emnapi/index'
import type { InstantiatedSource } from './load'

/** @public */
export interface OnLoadData {
  wasmModule: WebAssembly.Module
  wasmMemory: WebAssembly.Memory
}

/** @public */
export interface HandleOptions {
  onLoad (data: OnLoadData): InstantiatedSource | Promise<InstantiatedSource>
}

/** @public */
export class MessageHandler {
  onLoad: (data: OnLoadData) => InstantiatedSource | Promise<InstantiatedSource>
  instance: WebAssembly.Instance | undefined
  // module: WebAssembly.Module | undefined
  napiModule: NapiModule | undefined
  messagesBeforeLoad: any[]

  constructor (options: HandleOptions) {
    const onLoad = options.onLoad
    if (typeof onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    this.onLoad = onLoad
    this.instance = undefined
    // this.module = undefined
    this.napiModule = undefined
    this.messagesBeforeLoad = []
  }

  handle (e: any): void {
    if (e?.data?.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload

      const onLoad = this.onLoad
      if (type === 'load') {
        if (this.instance !== undefined) return
        let source: InstantiatedSource | Promise<InstantiatedSource>
        try {
          source = onLoad(payload)
        } catch (err) {
          onLoaded.call(this, err, null, payload)
          return
        }
        const then = source && 'then' in source ? source.then : undefined
        if (typeof then === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          then.call(
            source,
            (source) => { onLoaded.call(this, null, source, payload) },
            (err) => { onLoaded.call(this, err, null, payload) }
          )
        } else {
          onLoaded.call(this, null, source as InstantiatedSource, payload)
        }
      } else if (type === 'start') {
        handleAfterLoad.call(this, e, () => {
          notifyPthreadCreateResult(payload.sab, 1)
          this.napiModule!.startThread(payload.tid, payload.arg)
        })
      } else if (type === 'async-worker-init') {
        handleAfterLoad.call(this, e, () => {
          this.napiModule!.initWorker(payload.arg)
        })
      } else if (type === 'async-work-execute') {
        handleAfterLoad.call(this, e, () => {
          this.napiModule!.executeAsyncWork(payload.work)
        })
      }
    }
  }
}

function handleAfterLoad (this: MessageHandler, e: any, f: (e: any) => void): void {
  if (this.instance !== undefined) {
    f.call(this, e)
  } else {
    this.messagesBeforeLoad.push(e.data)
  }
}

interface LoadPayload {
  wasmModule: WebAssembly.Module
  wasmMemory: WebAssembly.Memory
  sab?: Int32Array
}

function notifyPthreadCreateResult (sab: Int32Array | undefined, result: number): void {
  if (sab) {
    Atomics.store(sab, 0, result)
    Atomics.notify(sab, 0)
  }
}

function onLoaded (this: MessageHandler, err: Error | null, source: InstantiatedSource | null, payload: LoadPayload): void {
  if (err) {
    notifyPthreadCreateResult(payload.sab, 2)
    throw err
  }

  if (source == null) {
    notifyPthreadCreateResult(payload.sab, 2)
    throw new TypeError('onLoad should return an object')
  }

  const instance = source.instance
  const napiModule = source.napiModule

  if (!instance) {
    notifyPthreadCreateResult(payload.sab, 2)
    throw new TypeError('onLoad should return an object which includes "instance"')
  }
  if (!napiModule) {
    notifyPthreadCreateResult(payload.sab, 2)
    throw new TypeError('onLoad should return an object which includes "napiModule"')
  }
  if (!napiModule.childThread) {
    notifyPthreadCreateResult(payload.sab, 2)
    throw new Error('napiModule should be created with `childThread: true`')
  }

  this.instance = instance
  this.napiModule = napiModule

  const postMessage = napiModule.postMessage!
  postMessage({
    __emnapi__: {
      type: 'loaded',
      payload: {}
    }
  })

  const messages = this.messagesBeforeLoad
  this.messagesBeforeLoad = []
  for (let i = 0; i < messages.length; i++) {
    const data = messages[i]
    this.handle({ data })
  }
}
