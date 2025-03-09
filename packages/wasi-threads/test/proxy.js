export class Worker {
  constructor (url, options) {
    if (typeof window !== 'undefined') {
      return new window.Worker(url, options)
    }
    this.id = String(Math.random())
    globalThis.addEventListener('message', ({ data }) => {
      if (data.payload.id === this.id) {
        if (data.type === 'onmessage' || data.type === 'onmessageerror') {
          this[data.type]?.({ data: data.payload.data })
        }
        if (data.type === 'error') {
          this.onerror?.(data.payload.data)
        }
      }
    })
    postMessage({
      type: 'new',
      payload: {
        id: this.id,
        url: typeof url === 'string' ? url : url.href,
        options
      }
    })
  }

  postMessage () {
    postMessage({
      type: 'postMessage',
      payload: {
        id: this.id,
        args: Array.prototype.slice.call(arguments)
      }
    })
  }

  terminate () {
    postMessage({
      type: 'terminate',
      payload: {
        id: this.id
      }
    })
  }
}

export function addProxyListener (worker) {
  const map = new Map()
  worker.onmessage = (e) => {
    const { type, payload } = e.data
    if (type === 'new') {
      const { id, url, options } = payload
      const w = new globalThis.Worker(url, options)
      map.set(id, w)
      w.onmessage = (e) => {
        worker.postMessage({ type: 'onmessage', payload: { id, data: e.data } })
      }
      w.onmessageerror = (e) => {
        worker.postMessage({ type: 'onmessageerror', payload: { id, data: e.data } })
      }
      w.onerror = (e) => {
        worker.postMessage({
          type: 'onerror',
          payload: {
            id,
            data: {
              message: e.message,
              filename: e.filename,
              lineno: e.lineno,
              colno: e.colno,
              error: e.error
            }
          }
        })
      }
    } else if (type === 'postMessage') {
      const { id, args } = payload
      const w = map.get(id)
      w.postMessage.apply(w, args)
    } else if (type === 'terminate') {
      const { id } = payload
      map.get(id).terminate()
      map.delete(id)
    }
  }
}
