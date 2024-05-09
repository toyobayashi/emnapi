/* eslint-disable no-eval */
/* eslint-disable no-undef */

(function () {
  // const log = (...args) => {
  //   const str = require('util').format(...args)
  //   require('fs').writeSync(1, str + '\n')
  // }
  // const error = (...args) => {
  //   const str = require('util').format(...args)
  //   require('fs').writeSync(2, str + '\n')
  // }
  let WASI, wasiThreads, name, model

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const nodeWorkerThreads = require('worker_threads')
    name = nodeWorkerThreads.workerData.name
    model = nodeWorkerThreads.workerData.model

    const parentPort = nodeWorkerThreads.parentPort

    wasiThreads = require('..')

    parentPort.on('message', (data) => {
      globalThis.onmessage({ data })
    })

    Object.assign(globalThis, {
      self: globalThis,
      require,
      Worker: nodeWorkerThreads.Worker,
      importScripts: function (f) {
        (0, eval)(fs.readFileSync(f, 'utf8') + '//# sourceURL=' + f)
      },
      postMessage: function (msg) {
        parentPort.postMessage(msg)
      }
    })

    WASI = require('node:wasi').WASI
  } else {
    importScripts('../dist/wasi-threads.js')
    WASI = globalThis.wasmUtil.WASI
    name = globalThis.name
  }

  console.log(`name: ${name}`)

  const { MessageHandler, WASIThreads, createInstanceProxy } = wasiThreads
  const postMessage = typeof globalThis.postMessage === 'function'
    ? globalThis.postMessage
    : function (msg) {
      parentPort.postMessage(msg)
    }

  const handler = new MessageHandler({
    onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1',
        env: process.env,
        print: ENVIRONMENT_IS_NODE
          ? (...args) => {
              const str = require('util').format(...args)
              require('fs').writeSync(1, str + '\n')
            }
          : function () { console.log.apply(console, arguments) }
      })

      const wasiThreads = new WASIThreads({
        postMessage
      })

      const instance = createInstanceProxy(new WebAssembly.Instance(wasmModule, {
        env: {
          memory: wasmMemory
        },
        ...wasi.getImportObject(),
        ...wasiThreads.getImportObject()
      }), wasmMemory, model)

      wasiThreads.setup(instance, wasmModule, wasmMemory)
      if (model === 'reactor') {
        wasi.initialize(instance)
      } else {
        wasi.start(instance)
      }

      return { module: wasmModule, instance }
    },
    postMessage
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
})()
