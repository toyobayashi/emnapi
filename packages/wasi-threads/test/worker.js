/* eslint-disable no-eval */
/* eslint-disable no-undef */

(function () {
  let WASI, wasiThreads, name

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const nodeWorkerThreads = require('worker_threads')
    name = nodeWorkerThreads.workerData.name

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
    importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
    importScripts('../dist/wasi-threads.js')
    WASI = globalThis.wasmUtil.WASI
    name = globalThis.name
    wasiThreads = globalThis.wasiThreads
  }

  console.log(`name: ${name}`)

  const { ThreadMessageHandler, WASIThreads, createInstanceProxy } = wasiThreads

  const handler = new ThreadMessageHandler({
    onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1',
        ...(ENVIRONMENT_IS_NODE ? { env: process.env } : {})
      })

      const wasiThreads = new WASIThreads({
        childThread: true
      })

      const instance = createInstanceProxy(new WebAssembly.Instance(wasmModule, {
        env: {
          memory: wasmMemory
        },
        ...wasi.getImportObject(),
        ...wasiThreads.getImportObject()
      }), wasmMemory)

      wasiThreads.setup(instance, wasmModule, wasmMemory)
      if ('_start' in instance.exports) {
        wasi.start(instance)
      } else {
        wasi.initialize(instance)
      }

      return { module: wasmModule, instance }
    }
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
})()
