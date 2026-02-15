/* eslint-disable camelcase */
const { join } = require('path')
const fs = require('fs')
const { Worker } = require('worker_threads')
const common = require('./common.js')

const emnapi = require('../runtime')
const context = emnapi.getDefaultContext()

function getDir () {
  let buildDir
  if ('EMNAPI_TEST_WASI_THREADS' in process.env) {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-wasi-threads' : '.build/wasm32-wasi-threads'
  } else if ('EMNAPI_TEST_WASI' in process.env) {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-wasi' : '.build/wasm32-wasi'
  } else if ('EMNAPI_TEST_WASM32' in process.env) {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-unknown-unknown' : '.build/wasm32-unknown-unknown'
  } else if ('EMNAPI_TEST_NATIVE' in process.env) {
    buildDir = `.build/${process.arch}-${process.platform}`
  } else {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-unknown-emscripten' : '.build/wasm32-unknown-emscripten'
  }
  return join(__dirname, buildDir, common.buildType)
}

function getEntry (targetName) {
  return join(getDir(), `${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : (process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32) ? 'wasm' : 'js'}`)
}

exports.getEntry = getEntry

const RUNTIME_UV_THREADPOOL_SIZE = ('UV_THREADPOOL_SIZE' in process.env) ? Number(process.env.UV_THREADPOOL_SIZE) : 4

function loadPath (request, options) {
  try {
    if (process.env.EMNAPI_TEST_NATIVE) {
      return Promise.resolve(require(request))
    }

    if (process.env.EMNAPI_TEST_WASI) {
      const { WASI } = require('./wasi')
      const { createNapiModule, loadNapiModule } = require('@emnapi/core')
      const v8 = require('@emnapi/core/plugins/v8').default
      const wasi = new WASI({
        fs
      })
      const napiModule = createNapiModule({
        context,
        filename: request,
        asyncWorkPoolSize: process.env.EMNAPI_TEST_WASI_THREADS
          ? RUNTIME_UV_THREADPOOL_SIZE
          : -RUNTIME_UV_THREADPOOL_SIZE,
        ...(process.env.EMNAPI_TEST_WASI_THREADS
          ? {
              reuseWorker: {
                size: RUNTIME_UV_THREADPOOL_SIZE * 4,
                strict: true
              },
              waitThreadStart: 1000,
              onCreateWorker () {
                return new Worker(join(__dirname, './worker.mjs'), {
                  type: 'module',
                  env: process.env,
                  execArgv: ['--experimental-wasi-unstable-preview1']
                })
              }
            }
          : {}
        ),
        plugins: [
          v8,
          require('@emnapi/core/plugins/async-work').default,
          require('@emnapi/core/plugins/threadsafe-function').default
        ],
        ...(options || {})
      })

      const p = new Promise((resolve, reject) => {
        loadNapiModule(napiModule, fs.readFileSync(request), {
          wasi,
          overwriteImports (importObject) {
            if (process.env.EMNAPI_TEST_WASI_THREADS) {
              importObject.env.memory = new WebAssembly.Memory({
                initial: 16777216 / 65536,
                maximum: 2147483648 / 65536,
                shared: true
              })
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
      const { v8, asyncWork, tsfn } = require('@emnapi/core/plugins')
      const napiModule = createNapiModule({
        context,
        asyncWorkPoolSize: RUNTIME_UV_THREADPOOL_SIZE,
        onCreateWorker () {
          return new Worker(join(__dirname, './worker.mjs'), {
            type: 'module',
            env: process.env
          })
        },
        plugins: [v8, asyncWork, tsfn],
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
        const sharedMemory = new WebAssembly.Memory({
          initial: 16777216 / 65536,
          maximum: 2147483648 / 65536,
          shared: true
        })
        loadNapiModule(napiModule, fs.readFileSync(request), {
          overwriteImports (importObject) {
            importObject.env.memory = sharedMemory
            importObject.env.console_log = function (fmt, ...args) {
              const fmtString = UTF8ToString(fmt)
              console.log(fmtString, ...args)
              return 0
            }
            importObject.env.console_error = function (fmt, ...args) {
              const fmtString = UTF8ToString(fmt)
              console.error(fmtString, ...args)
              return 0
            }
            importObject.env.sleep = function (n) {
              const end = Date.now() + n * 1000
              while (Date.now() < end) {
                // ignore
              }
            }
          }
        }).then(({ instance }) => {
          wasmMemory = instance.exports.memory || sharedMemory
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
          asyncWorkPoolSize: RUNTIME_UV_THREADPOOL_SIZE,
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
      mod({
        locateFile (path, scriptDirectory) {
          const defaultResult = scriptDirectory + path

          /**
           * emscripten 3.1.58 bug introduced by
           * https://github.com/emscripten-core/emscripten/pull/21701
           */
          if (!fs.existsSync(defaultResult)) {
            return join(getDir(), path)
          }

          return defaultResult
        }
      }).then((Module) => {
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

exports.supportWeakSymbol = /*#__PURE__*/ (function () {
  try {
    // eslint-disable-next-line symbol-description
    const sym = Symbol()
    // eslint-disable-next-line no-new
    new WeakRef(sym)
    new WeakMap().set(sym, undefined)
  } catch (_) {
    return false
  }
  return true
})()
