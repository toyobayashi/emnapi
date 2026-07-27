const NativeWorker = globalThis.Worker || class {}

class BrowserWorker extends NativeWorker {
  on (event, listener) {
    this.addEventListener(event, ({ data }) => listener(data))
    return this
  }

  once (event, listener) {
    this.addEventListener(event, ({ data }) => listener(data), { once: true })
    return this
  }
}

const parentPort = typeof globalThis.document === 'undefined'
  ? {
      on (event, listener) {
        globalThis.addEventListener(event, ({ data }) => listener(data))
        return this
      },
      postMessage (value, transfer) {
        globalThis.postMessage(value, transfer)
      }
    }
  : null

export {
  BrowserWorker as Worker,
  parentPort
}

export const isMainThread = parentPort === null
