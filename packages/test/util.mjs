/* eslint-disable camelcase */
import fs from 'fs'
import { Worker } from 'worker_threads'
import { getDefaultContext } from '@emnapi/runtime'
import { WASI } from './wasi.js'
import { createNapiModule, loadNapiModule } from '@emnapi/core'
import v8 from '@emnapi/core/plugins/v8'
import asyncWork from '@emnapi/core/plugins/async-work'
import tsfn from '@emnapi/core/plugins/threadsafe-function'

const context = getDefaultContext()

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
  return new URL(buildDir + '/' + (process.env.NODE_ENV === 'production' ? 'Release/' : 'Debug/'), import.meta.url)
}

export function getEntry (targetName) {
  return new URL(`${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : (process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32) ? 'wasm' : 'js'}`, getDir())
}

const RUNTIME_UV_THREADPOOL_SIZE = ('UV_THREADPOOL_SIZE' in process.env) ? Number(process.env.UV_THREADPOOL_SIZE) : 4

function emscripten_get_now () {
  return performance.timeOrigin + performance.now()
}

export function loadPath (request, options) {
  try {
    if (process.env.EMNAPI_TEST_NATIVE) {
      return import(request)
    }

    if (process.env.EMNAPI_TEST_WASI) {
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
                return new Worker(new URL('./worker.mjs', import.meta.url), {
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
          asyncWork,
          tsfn
        ],
        ...(options || {})
      })

      const p = new Promise((resolve, reject) => {
        loadNapiModule(napiModule, fs.readFileSync(request), {
          wasi,
          overwriteImports (importObject) {
            importObject.env.emscripten_get_now = emscripten_get_now
            if (process.env.EMNAPI_TEST_WASI_THREADS) {
              importObject.env.memory = new WebAssembly.Memory({
                initial: 16777216 / 65536,
                maximum: 4294967296 / 65536,
                shared: true
              })
            }
          }
        }).then((source) => {
          if (process.env.EMNAPI_TEST_4GB) {
            source.instance.exports.malloc(2147483648)
          }
          resolve(napiModule.exports)
        }).catch(reject)
      })
      p.Module = napiModule
      return p
    }

    if (process.env.EMNAPI_TEST_WASM32) {
      const napiModule = createNapiModule({
        context,
        asyncWorkPoolSize: RUNTIME_UV_THREADPOOL_SIZE,
        onCreateWorker () {
          return new Worker(new URL('./worker.mjs', import.meta.url), {
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
          maximum: 4294967296 / 65536,
          shared: true
        })
        loadNapiModule(napiModule, fs.readFileSync(request), {
          overwriteImports (importObject) {
            importObject.env.memory = sharedMemory
            importObject.env.emscripten_get_now = emscripten_get_now
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
    
    const p = new Promise((resolve, reject) => {
      import(request).then(mod => {
        if (mod.Module) {
          const p = new Promise((resolve, reject) => {
            resolveEmnapiExports(mod.Module, resolve, reject)
          })
          p.Module = mod.Module
          return p
        }
        mod.default({
          locateFile (path, scriptDirectory) {
            const defaultResult = scriptDirectory + path
  
            /**
             * emscripten 3.1.58 bug introduced by
             * https://github.com/emscripten-core/emscripten/pull/21701
             */
            if (!fs.existsSync(defaultResult)) {
              return new URL(path, getDir()).href
            }
  
            return defaultResult
          }
        }).then((Module) => {
          p.Module = Module
          if (process.env.EMNAPI_TEST_4GB) {
            Module._malloc(2147483648)
          }
          resolveEmnapiExports(Module, resolve, reject)
        }).catch(reject)
      })
    })
    return p
  } catch (err) {
    return Promise.reject(err)
  }
}

export function load (targetName, options) {
  const request = getEntry(targetName)
  return loadPath(request, options)
}

export const supportWeakSymbol = /*#__PURE__*/ (function () {
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
