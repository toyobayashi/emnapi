// globalThis.ENVIRONMENT_IS_PTHREAD = true

// const log = (...args) => {
//   const str = require('util').format(...args)
//   require('fs').writeSync(1, str + '\n')
// }
// const error = (...args) => {
//   const str = require('util').format(...args)
//   require('fs').writeSync(2, str + '\n')
// }

const nodeWorkerThreads = require('worker_threads')

const parentPort = nodeWorkerThreads.parentPort

parentPort.on('message', (data) => {
  onmessage({ data })
})

const fs = require('fs')

Object.assign(global, {
  self: global,
  require,
  // Module,
  location: {
    href: __filename
  },
  Worker: nodeWorkerThreads.Worker,
  importScripts: function (f) {
    // eslint-disable-next-line no-eval
    (0, eval)(fs.readFileSync(f, 'utf8') + '//# sourceURL=' + f)
  },
  postMessage: function (msg) {
    parentPort.postMessage(msg)
  },
  performance: global.performance || {
    now: function () {
      return Date.now()
    }
  }
})

const { WASI } = require('./wasi')
const { createNapiModule } = require('@emnapi/core')

function instantiate (wasmMemory, wasmModule, tid, arg) {
  const wasi = new WASI({
    fs,
    print (...args) {
      const str = require('util').format(...args)
      fs.writeSync(1, str + '\n')
    }
  })
  const napiModule = createNapiModule({
    childThread: true
  })
  const instance = new WebAssembly.Instance(wasmModule, {
    wasi_snapshot_preview1: wasi.wasiImport,
    env: {
      memory: wasmMemory,
      ...napiModule.imports.env
    },
    napi: napiModule.imports.napi,
    emnapi: napiModule.imports.emnapi,
    wasi: {
      'thread-spawn': function (startArg) {
        return napiModule.spawnThread(startArg)
      }
    }
  })
  const noop = () => {}
  const exportsProxy = new Proxy({}, {
    get (t, p, r) {
      if (p === 'memory') {
        return wasmMemory
      }
      if (p === '_initialize') {
        return noop
      }
      return Reflect.get(instance.exports, p, r)
    }
  })
  const instanceProxy = new Proxy(instance, {
    get (target, p, receiver) {
      if (p === 'exports') {
        return exportsProxy
      }
      return Reflect.get(target, p, receiver)
    }
  })

  wasi.initialize(instanceProxy)
  postMessage({
    __emnapi__: {
      type: 'loaded',
      payload: {
        err: null
      }
    }
  })
  instance.exports.wasi_thread_start(tid, arg)
}

self.onmessage = function (e) {
  if (e.data.__emnapi__) {
    const type = e.data.__emnapi__.type
    const payload = e.data.__emnapi__.payload
    if (type === 'load') {
      try {
        instantiate(payload.wasmMemory, payload.wasmModule, payload.tid, payload.arg)
      } catch (err) {
        postMessage({
          __emnapi__: {
            type: 'loaded',
            payload: { err }
          }
        })
      }
    }
  }
}
