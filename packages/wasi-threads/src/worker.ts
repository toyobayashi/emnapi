import type { WorkerMessageEvent } from './thread-manager'

/** @public */
export interface OnLoadData {
  wasmModule: WebAssembly.Module
  wasmMemory: WebAssembly.Memory
  sab?: Int32Array
}

export interface OnStartData {
  tid: number
  arg: number
  sab?: Int32Array
}

/** @public */
export interface HandleOptions {
  onLoad (data: OnLoadData): WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>
  postMessage?: (message: any) => void
}

/** @public */
export class MessageHandler {
  onLoad: (data: OnLoadData) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>
  instance: WebAssembly.Instance | undefined
  messagesBeforeLoad: any[]
  postMessage: (message: any) => void

  public constructor (options: HandleOptions) {
    const onLoad = options.onLoad
    const postMsg = typeof options.postMessage === 'function'
      ? options.postMessage
      : typeof postMessage === 'function'
        ? postMessage
        : undefined
    if (typeof onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    if (typeof postMsg !== 'function') {
      throw new TypeError('options.postMessage is not a function')
    }
    this.onLoad = onLoad
    this.postMessage = postMsg
    this.instance = undefined
    // this.module = undefined
    this.messagesBeforeLoad = []
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

  private _load (payload: OnLoadData): void {
    if (this.instance !== undefined) return
    const onLoad = this.onLoad
    let source: WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>
    try {
      source = onLoad(payload)
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
    notifyPthreadCreateResult(payload.sab, 1)
    if (typeof this.instance!.exports.wasi_thread_start !== 'function') {
      throw new TypeError('wasi_thread_start is not exported')
    }
    const postMessage = this.postMessage!
    const tid = payload.tid
    const startArg = payload.arg
    ;(this.instance!.exports.wasi_thread_start as Function)(tid, startArg)
    postMessage({
      __emnapi__: {
        type: 'cleanup-thread',
        payload: {
          tid
        }
      }
    })
  }

  /** @virtual */
  protected onLoadSuccess (_source: WebAssembly.WebAssemblyInstantiatedSource): void {}

  protected _loaded (err: Error | null, source: WebAssembly.WebAssemblyInstantiatedSource | null, payload: OnLoadData): void {
    if (err) {
      notifyPthreadCreateResult(payload.sab, 2)
      throw err
    }

    if (source == null) {
      notifyPthreadCreateResult(payload.sab, 2)
      throw new TypeError('onLoad should return an object')
    }

    const instance = source.instance

    if (!instance) {
      notifyPthreadCreateResult(payload.sab, 2)
      throw new TypeError('onLoad should return an object which includes "instance"')
    }

    this.instance = instance

    this.onLoadSuccess(source)

    const postMessage = this.postMessage!
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

  protected handleAfterLoad<E extends WorkerMessageEvent> (e: E, f: (e: E) => void): void {
    if (this.instance !== undefined) {
      f.call(this, e)
    } else {
      this.messagesBeforeLoad.push(e.data)
    }
  }
}

function notifyPthreadCreateResult (sab: Int32Array | undefined, result: number): void {
  if (sab) {
    Atomics.store(sab, 0, result)
    Atomics.notify(sab, 0)
  }
}
