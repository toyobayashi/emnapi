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
  if (process.env.EMNAPI_TEST_WASI_THREADS) {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-wasip1-threads' : '.build/wasm32-wasip1-threads'
  } else if (process.env.EMNAPI_TEST_WASI) {
    buildDir = process.env.MEMORY64 ? '.build/wasm64-wasip1' : '.build/wasm32-wasip1'
  } else if (process.env.EMNAPI_TEST_WASM32) {
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
const ASYNC_WORK_POOL_SIZE = typeof window === 'undefined'
  ? RUNTIME_UV_THREADPOOL_SIZE
  : -RUNTIME_UV_THREADPOOL_SIZE
const wasmInputCache = new Map()

function getWasmInput (request) {
  if (typeof window === 'undefined') {
    return fs.readFileSync(request)
  }

  const href = request instanceof URL ? request.href : String(request)
  let input = wasmInputCache.get(href)
  if (!input) {
    input = fetch(href).then(async response => {
      if (!response.ok) {
        throw new Error(`Unable to load WebAssembly: ${response.status} ${href}`)
      }
      const bytes = await response.arrayBuffer()
      if (bytes.byteLength === 0) {
        throw new Error(`Unable to load WebAssembly: empty response ${href}`)
      }
      return bytes
    })
    wasmInputCache.set(href, input)
  }
  return input
}

function emscripten_get_now () {
  return performance.timeOrigin + performance.now()
}

export function loadPath (request, options) {
  try {
    if (process.env.EMNAPI_TEST_NATIVE) {
      return import(/* @vite-ignore */ request)
    }

    if (process.env.EMNAPI_TEST_WASI) {
      const wasi = new WASI({
        version: 'preview1',
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
              waitThreadStart: typeof window === 'undefined' ? 1000 : false,
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
        loadNapiModule(
          napiModule,
          getWasmInput(request),
          {
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
          }
        ).then((source) => {
          napiModule.wasmMemory = source.instance.exports.memory
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
        asyncWorkPoolSize: ASYNC_WORK_POOL_SIZE,
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
        loadNapiModule(
          napiModule,
          getWasmInput(request),
          {
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
          }
        ).then(({ instance }) => {
          wasmMemory = instance.exports.memory || sharedMemory
          napiModule.wasmMemory = wasmMemory
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
          asyncWorkPoolSize: ASYNC_WORK_POOL_SIZE,
          ...(options || {})
        }))
      } catch (err) {
        reject(err)
      }
    }

    const p = new Promise((resolve, reject) => {
      import(/* @vite-ignore */ request).then(async mod => {
        if (mod.Module) {
          const p = new Promise((resolve, reject) => {
            resolveEmnapiExports(mod.Module, resolve, reject)
          })
          p.Module = mod.Module
          return p
        }
        let mainScriptUrlOrBlob
        if (typeof window !== 'undefined') {
          const workerScriptUrl = new URL(
            request.pathname.replace('/.build/', '/@emnapi-worker/'),
            globalThis.location.origin
          )
          const response = await fetch(workerScriptUrl)
          if (!response.ok) {
            throw new Error(`Unable to load Emscripten worker script: ${response.status} ${workerScriptUrl}`)
          }
          mainScriptUrlOrBlob = new Blob([await response.text()], { type: 'text/javascript' })
        }
        mod.default({
          mainScriptUrlOrBlob,
          locateFile (path, scriptDirectory) {
            if (typeof window !== 'undefined') {
              return new URL(path, getDir()).href
            }
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
  if (targetName === 'naa_binding' &&
      (process.env.MEMORY64 || process.env.EMNAPI_TEST_WASI_THREADS)) {
    targetName = 'naa_binding_noexcept'
  }
  const request = getEntry(targetName)
  return loadPath(request, options)
}

export const supportWeakSymbol = /* #__PURE__ */ (function () {
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
