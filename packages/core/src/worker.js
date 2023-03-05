export class MessageHandler {
  constructor (options) {
    const onLoad = options.onLoad
    if (typeof onLoad !== 'function') {
      throw new TypeError('options.onLoad is not a function')
    }
    this.onLoad = onLoad
    // this.instance = undefined
    // this.module = undefined
    this.napiModule = undefined
  }

  handle (e) {
    if (e && e.data && e.data.__emnapi__) {
      const type = e.data.__emnapi__.type
      const payload = e.data.__emnapi__.payload

      const onLoad = this.onLoad
      if (type === 'load') {
        const source = onLoad(payload)
        const then = source && source.then
        if (typeof then === 'function') {
          then.call(
            source,
            (source) => { onLoaded.call(this, source) },
            (err) => { throw err }
          )
        } else {
          onLoaded.call(this, source)
        }
      } else if (type === 'start') {
        this.napiModule.startThread(payload.tid, payload.arg)
      }
    }
  }
}

function onLoaded (source) {
  const napiModule = source.napiModule

  if (!napiModule) throw new TypeError('onLoad should return a napiModule')
  if (!napiModule.childThread) throw new Error('napiModule should be created with `childThread: true`')

  this.napiModule = napiModule

  if (napiModule.childThread) {
    const postMessage = napiModule.postMessage
    postMessage({
      __emnapi__: {
        type: 'loaded',
        payload: {}
      }
    })
  }
}
