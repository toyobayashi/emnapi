/* eslint-disable no-eval */

(function (main) {
  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const _require = function (request) {
      if (request === '@emnapi/wasi-threads') return require('..')
      return require(request)
    }

    const _init = function () {
      const nodeWorkerThreads = require('node:worker_threads')
      const parentPort = nodeWorkerThreads.parentPort

      parentPort.on('message', (data) => {
        globalThis.onmessage({ data })
      })

      Object.assign(globalThis, {
        self: globalThis,
        require,
        Worker: nodeWorkerThreads.Worker,
        importScripts: function (f) {
          (0, eval)(require('node:fs').readFileSync(f, 'utf8') + '//# sourceURL=' + f)
        },
        postMessage: function (msg) {
          parentPort.postMessage(msg)
        }
      })
    }

    main(_require, _init)
  } else {
    // eslint-disable-next-line no-undef
    importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
    // eslint-disable-next-line no-undef
    importScripts('../dist/wasi-threads.js')

    const nodeWasi = { WASI: globalThis.wasmUtil.WASI }
    const nodeWorkerThreads = {
      workerData: {
        name: globalThis.name
      }
    }
    const _require = function (request) {
      if (request === '@emnapi/wasi-threads') return globalThis.wasiThreads
      if (request === 'node:worker_threads' || request === 'worker_threads') return nodeWorkerThreads
      if (request === 'node:wasi' || request === 'wasi') return nodeWasi
      throw new Error('Can not find module: ' + request)
    }
    const _init = function () {}
    main(_require, _init)
  }
})(function main (require, init) {
  init()

  const { WASI } = require('node:wasi')
  const { workerData } = require('node:worker_threads')
  const { ThreadMessageHandler, WASIThreads, createInstanceProxy } = require('@emnapi/wasi-threads')

  console.log(`name: ${workerData.name}`)

  const handler = new ThreadMessageHandler({
    async onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1'
      })

      const wasiThreads = new WASIThreads({
        childThread: true
      })
      wasiThreads.patchWasiInstance(wasi)

      const originalInstance = await WebAssembly.instantiate(wasmModule, {
        env: {
          memory: wasmMemory,
          print_string: function (ptr) {
            const HEAPU8 = new Uint8Array(wasmMemory.buffer)
            let len = 0
            while (HEAPU8[ptr + len] !== 0) len++
            const string = new TextDecoder().decode(HEAPU8.slice(ptr, ptr + len))
            console.log(string)
          }
        },
        ...wasi.getImportObject(),
        ...wasiThreads.getImportObject()
      })

      const instance = createInstanceProxy(originalInstance, wasmMemory)

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
})
