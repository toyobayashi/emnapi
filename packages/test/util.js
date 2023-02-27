/* eslint-disable camelcase */
const { join } = require('path')
const fs = require('fs')
const common = require('./common.js')

const emnapi = require('../runtime')
const context = emnapi.getDefaultContext()

function getEntry (targetName) {
  return join(__dirname, `./.cgenbuild/${common.buildType}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : (process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32) ? 'wasm' : 'js'}`)
}

exports.getEntry = getEntry

function loadPath (request, options) {
  try {
    if (process.env.EMNAPI_TEST_NATIVE) {
      return Promise.resolve(require(request))
    }

    if (process.env.EMNAPI_TEST_WASI) {
      const { WASI } = require('./wasi')
      const { Worker } = require('worker_threads')
      const { createNapiModule, loadNapiModule } = require('@emnapi/core')
      const wasi = new WASI({
        fs
      })
      const napiModule = createNapiModule({
        context,
        filename: request,
        onCreateWorker () {
          return new Worker(join(__dirname, './worker.js'), {
            env: process.env,
            execArgv: ['--experimental-wasi-unstable-preview1']
          })
        },
        ...(options || {})
      })
      let wasmMemory
      if (process.env.EMNAPI_TEST_WASI_THREADS) {
        wasmMemory = new WebAssembly.Memory({
          initial: 16777216 / 65536,
          maximum: 2147483648 / 65536,
          shared: true
        })
      }

      const p = new Promise((resolve, reject) => {
        loadNapiModule(fs.readFileSync(request), {
          napiModule,
          wasi,
          overwriteImports (importObject) {
            if (process.env.EMNAPI_TEST_WASI_THREADS) {
              importObject.env.memory = wasmMemory
            }
          }
        }).then(() => {
          resolve(napiModule.exports)
        }).catch(reject)
      })
      p.Module = napiModule
      return p
    }

    if (process.env.EMNAPI_TEST_WASM32) {
      const { createNapiModule, loadNapiModule } = require('@emnapi/core')
      const napiModule = createNapiModule({
        context,
        ...(options || {})
      })
      const p = new Promise((resolve, reject) => {
        let wasmMemory
        const UTF8ToString = (ptr) => {
          ptr >>>= 0
          if (!ptr) return ''
          const HEAPU8 = new Uint8Array(wasmMemory.buffer)
          let end
          for (end = ptr; HEAPU8[end];) ++end
          const shared = (typeof SharedArrayBuffer === 'function') && (wasmMemory.buffer instanceof SharedArrayBuffer)
          return new TextDecoder().decode(shared ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end))
        }
        loadNapiModule(fs.readFileSync(request), {
          napiModule,
          overwriteImports (importObject) {
            importObject.env.console_log = function (fmt, ...args) {
              const fmtString = UTF8ToString(fmt)
              console.log(fmtString, ...args)
              return 0
            }
          }
        }).then(({ instance }) => {
          wasmMemory = instance.exports.memory
          resolve(napiModule.exports)
        }).catch(reject)
      })
      p.Module = napiModule
      return p
    }

    const mod = require(request)
    const resolveEmnapiExports = (Module, resolve, reject) => {
      try {
        resolve(Module.emnapiInit({
          context,
          ...(options || {})
        }))
      } catch (err) {
        reject(err)
      }
    }

    if (mod.Module) {
      const p = new Promise((resolve, reject) => {
        resolveEmnapiExports(mod.Module, resolve, reject)
      })
      p.Module = mod.Module
      return p
    }
    const p = new Promise((resolve, reject) => {
      mod().then((Module) => {
        p.Module = Module
        resolveEmnapiExports(Module, resolve, reject)
      }).catch(reject)
    })
    return p
  } catch (err) {
    return Promise.reject(err)
  }
}

exports.loadPath = loadPath

exports.load = function (targetName, options) {
  const request = getEntry(targetName)
  return loadPath(request, options)
}
