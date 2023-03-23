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
  let fs, WASI, emnapiCore

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const nodeWorkerThreads = require('worker_threads')

    const parentPort = nodeWorkerThreads.parentPort

    parentPort.on('message', (data) => {
      globalThis.onmessage({ data })
    })

    fs = require('fs')

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

    WASI = require('./wasi').WASI
    emnapiCore = require('@emnapi/core')
  } else {
    importScripts('../../node_modules/memfs-browser/dist/memfs.js')
    importScripts('../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
    importScripts('../../node_modules/@emnapi/core/dist/emnapi-core.js')
    emnapiCore = globalThis.emnapiCore

    const { Volume, createFsFromVolume } = memfs
    fs = createFsFromVolume(Volume.fromJSON({
      '/': null
    }))

    WASI = globalThis.wasmUtil.WASI
  }

  const { instantiateNapiModuleSync, MessageHandler } = emnapiCore

  const handler = new MessageHandler({
    onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        fs,
        print: ENVIRONMENT_IS_NODE
          ? (...args) => {
              const str = require('util').format(...args)
              fs.writeSync(1, str + '\n')
            }
          : function () { console.log.apply(console, arguments) }
      })

      const UTF8ToString = (ptr) => {
        ptr >>>= 0
        if (!ptr) return ''
        const HEAPU8 = new Uint8Array(wasmMemory.buffer)
        let end
        for (end = ptr; HEAPU8[end];) ++end
        const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
        return new TextDecoder().decode(shared ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end))
      }

      return instantiateNapiModuleSync(wasmModule, {
        childThread: true,
        wasi,
        overwriteImports (importObject) {
          importObject.env.memory = wasmMemory
          importObject.env.console_log = function (fmt, ...args) {
            const fmtString = UTF8ToString(fmt)
            console.log(fmtString, ...args)
            return 0
          }
          importObject.env.sleep = function (n) {
            const end = Date.now() + n * 1000
            while (Date.now() < end) {
              // ignore
            }
          }
        }
      })
    }
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
})()
