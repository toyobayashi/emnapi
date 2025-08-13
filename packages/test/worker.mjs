/* eslint-disable no-eval */
/* eslint-disable no-undef */

import * as emnapiCore from '../../node_modules/@emnapi/core/dist/emnapi-core.mjs'
// import * as emnapi from '../runtime/dist/emnapi.js'

(function () {
  // const log = (...args) => {
  //   const str = require('util').format(...args)
  //   require('fs').writeSync(1, str + '\n')
  // }
  // const error = (...args) => {
  //   const str = require('util').format(...args)
  //   require('fs').writeSync(2, str + '\n')
  // }
  let require, fs, WASI, ready

  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    ready = (async function () {
      let parentPort
      Object.assign(globalThis, {
        self: globalThis,
        importScripts: function (f) {
          (0, eval)(fs.readFileSync(f, 'utf8') + '//# sourceURL=' + f)
        },
        postMessage: function (msg) {
          parentPort?.postMessage(msg)
        }
      })

      const { createRequire } = await import('node:module')
      require = createRequire(import.meta.url)
      const nodeWorkerThreads = require('worker_threads')

      parentPort = nodeWorkerThreads.parentPort

      parentPort.on('message', (data) => {
        globalThis.onmessage({ data })
      })

      fs = require('fs')

      Object.assign(globalThis, {
        require,
        Worker: nodeWorkerThreads.Worker
      })

      WASI = require('node:wasi').WASI
    })()
  } else {
    ready = (async function () {
      const { Buffer } = await import('https://esm.sh/buffer@6.0.3')
      globalThis.Buffer = Buffer
      const memfs = await import('../../node_modules/memfs-browser/dist/memfs.esm.js')
      const wasmUtil = await import('../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js')
      const { Volume, createFsFromVolume } = memfs
      fs = createFsFromVolume(Volume.fromJSON({
        '/': null
      }))
      WASI = wasmUtil.WASI
    })()
  }

  const { instantiateNapiModule, MessageHandler } = emnapiCore

  const handler = new MessageHandler({
    async onLoad ({ wasmModule, wasmMemory }) {
      await ready
      const wasi = new WASI({
        fs,
        version: 'preview1',
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

      return instantiateNapiModule(wasmModule, {
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
