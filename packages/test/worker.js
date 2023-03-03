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

  const { instantiateNapiModuleSync, handleMessage } = emnapiCore

  function onLoad (payload) {
    const wasi = new WASI({
      fs,
      print: ENVIRONMENT_IS_NODE
        ? (...args) => {
            const str = require('util').format(...args)
            fs.writeSync(1, str + '\n')
          }
        : function () { console.log.apply(console, arguments) }
    })

    return instantiateNapiModuleSync(payload.wasmModule, {
      childThread: true,
      wasi,
      overwriteImports (importObject) {
        importObject.env.memory = payload.wasmMemory
      }
    })
  }

  let napiModule

  globalThis.onmessage = function (e) {
    handleMessage(e, (type, payload) => {
      if (type === 'load') {
        napiModule = onLoad(payload).napiModule
      } else if (type === 'start') {
        napiModule.startThread(payload.tid, payload.arg)
      }
    })
  }
})()
