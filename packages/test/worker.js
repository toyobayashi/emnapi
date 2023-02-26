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
const { createNapiModule, loadNapiModuleSync, handleMessage } = require('@emnapi/core')

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
  loadNapiModuleSync(napiModule, wasmModule, {
    wasi,
    overwriteImports (importObject) {
      importObject.env.memory = wasmMemory
    },
    tid,
    arg,
    postMessage (msg) {
      parentPort.postMessage(msg)
    }
  })
}

self.onmessage = function (e) {
  handleMessage(e, (type, payload) => {
    if (type === 'load') {
      instantiate(payload.wasmMemory, payload.wasmModule, payload.tid, payload.arg)
    }
  })
}
