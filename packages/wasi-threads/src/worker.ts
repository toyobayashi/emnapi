import { type LoadPayload, createMessage } from './command'
import type { WorkerMessageEvent } from './thread-manager'
import { getPostMessage, isTrapError, serizeErrorToBuffer } from './util'

export interface OnStartData {
  tid: number
  arg: number
  sab?: Int32Array
}

/** @public */
export interface ThreadMessageHandlerOptions {
  onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>
  postMessage?: (message: any) => void
}

/** @public */
export class ThreadMessageHandler {
  protected instance: WebAssembly.Instance | undefined
  private messagesBeforeLoad: any[]
  protected postMessage: (message: any) => void
  protected onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>

  public constructor (options?: ThreadMessageHandlerOptions) {
    const postMsg = getPostMessage(options)
    if (typeof postMsg !== 'function') {
      throw new TypeError('options.postMessage is not a function')
    }
    this.postMessage = postMsg
    this.onLoad = options?.onLoad
    this.instance = undefined
    // this.module = undefined
    this.messagesBeforeLoad = []
  }

  /** @virtual */
  public instantiate (data: LoadPayload): WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource> {
    if (typeof this.onLoad === 'function') {
      return this.onLoad(data)
    }
    throw new Error('ThreadMessageHandler.prototype.instantiate is not implemented')
  }

  /** @virtual */
  public handle (e: WorkerMessageEvent): void {
    if (e?.data?.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload

      if (type === 'load') {
        this._load(payload)
      } else if (type === 'start') {
        this.handleAfterLoad(e, () => {
          this._start(payload)
        })
      }
    }
  }

  private _load (payload: LoadPayload): void {
    if (this.instance !== undefined) return
    let source: WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>
    try {
      source = this.instantiate(payload)
    } catch (err) {
      this._loaded(err, null, payload)
      return
    }
    const then = source && 'then' in source ? source.then : undefined
    if (typeof then === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      then.call(
        source,
        (source) => { this._loaded(null, source, payload) },
        (err) => { this._loaded(err, null, payload) }
      )
    } else {
      this._loaded(null, source as WebAssembly.WebAssemblyInstantiatedSource, payload)
    }
  }

  private _start (payload: OnStartData): void {
    if (typeof this.instance!.exports.wasi_thread_start !== 'function') {
      const err = new TypeError('wasi_thread_start is not exported')
      notifyPthreadCreateResult(payload.sab, 2, err)
      throw err
    }
    const postMessage = this.postMessage!
    const tid = payload.tid
    const startArg = payload.arg
    notifyPthreadCreateResult(payload.sab, 1)
    try {
      (this.instance!.exports.wasi_thread_start as Function)(tid, startArg)
    } catch (err) {
      if (isTrapError(err)) {
        postMessage(createMessage('terminate-all-threads', {}))
      }
      throw err
    }
    postMessage(createMessage('cleanup-thread', { tid }))
  }

  protected _loaded (err: Error | null, source: WebAssembly.WebAssemblyInstantiatedSource | null, payload: LoadPayload): void {
    if (err) {
      notifyPthreadCreateResult(payload.sab, 2, err)
      throw err
    }

    if (source == null) {
      const err = new TypeError('onLoad should return an object')
      notifyPthreadCreateResult(payload.sab, 2, err)
      throw err
    }

    const instance = source.instance

    if (!instance) {
      const err = new TypeError('onLoad should return an object which includes "instance"')
      notifyPthreadCreateResult(payload.sab, 2, err)
      throw err
    }

    this.instance = instance

    const postMessage = this.postMessage!
    postMessage(createMessage('loaded', {}))

    const messages = this.messagesBeforeLoad
    this.messagesBeforeLoad = []
    for (let i = 0; i < messages.length; i++) {
      const data = messages[i]
      this.handle({ data })
    }
  }

  protected handleAfterLoad<E extends WorkerMessageEvent> (e: E, f: (e: E) => void): void {
    if (this.instance !== undefined) {
      f.call(this, e)
    } else {
      this.messagesBeforeLoad.push(e.data)
    }
  }
}

function notifyPthreadCreateResult (sab: Int32Array | undefined, result: number, error?: Error): void {
  if (sab) {
    serizeErrorToBuffer(sab.buffer as SharedArrayBuffer, result, error)
    Atomics.notify(sab, 0)
  }
}
