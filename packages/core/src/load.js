import { load, loadSync } from '@tybys/wasm-util'

function loadNapiModuleImpl (loadFn, napiModule, wasmInput, options) {
  if (!napiModule) {
    throw new TypeError('Invalid napiModule')
  }

  options = options == null ? {} : options
  const wasi = options.wasi
  const env = Object.assign({}, napiModule.imports.env, napiModule.imports.napi, napiModule.imports.emnapi)
  let importObject = {
    env,
    napi: napiModule.imports.napi,
    emnapi: napiModule.imports.emnapi,
    wasi: {
      'thread-spawn': function __imported_wasi_thread_spawn (startArg) {
        return napiModule.spawnThread(startArg, undefined)
      }
    }
  }

  if (wasi) {
    Object.assign(
      importObject,
      typeof wasi.getImportObject === 'function'
        ? wasi.getImportObject()
        : { wasi_snapshot_preview1: wasi.wasiImport }
    )
  }

  const overwriteImports = options.overwriteImports
  if (typeof overwriteImports === 'function') {
    const newImportObject = overwriteImports(importObject)
    if (typeof newImportObject === 'object' && newImportObject !== null) {
      importObject = newImportObject
    }
  }

  const tid = options.tid
  const arg = options.arg
  if (napiModule.childThread) {
    if (typeof tid !== 'number') {
      throw new TypeError('options.tid is not a number')
    }
    if (typeof arg !== 'number') {
      throw new TypeError('options.arg is not a number')
    }
  }

  return loadFn(wasmInput, importObject, (err, source) => {
    if (err) {
      if (napiModule.childThread) {
        const postMessage = napiModule.postMessage
        postMessage({
          __emnapi__: {
            type: 'loaded',
            payload: {
              tid,
              err
            }
          }
        })
      }
      throw err
    }

    let instance = source.instance

    const exportMemory = 'memory' in source.instance.exports
    const importMemory = 'memory' in importObject.env
    /** @type {WebAssembly.Memory} */
    const memory = exportMemory ? source.instance.exports.memory : importMemory ? importObject.env.memory : undefined
    if (!memory) {
      throw new Error('memory is neither exported nor imported')
    }
    if (wasi && !exportMemory && importMemory) {
      instance = {
        exports: Object.assign({}, source.instance.exports, { memory })
      }
    }
    const module = source.module
    if (wasi) {
      if (napiModule.childThread) {
        // https://github.com/nodejs/help/issues/4102
        const noop = () => {}
        const exports = instance.exports
        const exportsProxy = new Proxy({}, {
          get (t, p, r) {
            if (p === 'memory') {
              return memory
            }
            if (p === '_initialize') {
              return noop
            }
            return Reflect.get(exports, p, r)
          }
        })
        instance = new Proxy(instance, {
          get (target, p, receiver) {
            if (p === 'exports') {
              return exportsProxy
            }
            return Reflect.get(target, p, receiver)
          }
        })
      }
      wasi.initialize(instance)
    }

    if (napiModule.childThread) {
      const postMessage = napiModule.postMessage
      postMessage({
        __emnapi__: {
          type: 'loaded',
          payload: {
            tid,
            err: null
          }
        }
      })
      instance.exports.wasi_thread_start(tid, arg)
    } else {
      napiModule.init({
        instance,
        module,
        memory,
        table: instance.exports.__indirect_function_table
      })
    }

    return { instance, module }
  })
}

/**
 * @param {import('@emnapi/core').NapiModule} napiModule
 * @param {string | URL | BufferSource | WebAssembly.Module} wasmInput
 * @param {any} options
 * @returns {Promise<WebAssembly.WebAssemblyInstantiatedSource>}
 */
export function loadNapiModule (napiModule, wasmInput, options) {
  return loadNapiModuleImpl((wasmInput, importObject, callback) => {
    return load(wasmInput, importObject).then((source) => {
      return callback(null, source)
    }, err => {
      return callback(err)
    })
  }, napiModule, wasmInput, options)
}

/**
 * @param {import('@emnapi/core').NapiModule} napiModule
 * @param {BufferSource | WebAssembly.Module} wasmInput
 * @param {any} options
 * @returns {WebAssembly.WebAssemblyInstantiatedSource}
 */
export function loadNapiModuleSync (napiModule, wasmInput, options) {
  return loadNapiModuleImpl((wasmInput, importObject, callback) => {
    let source
    try {
      source = loadSync(wasmInput, importObject)
    } catch (err) {
      return callback(err)
    }
    return callback(null, source)
  }, napiModule, wasmInput, options)
}
