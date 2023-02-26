/* eslint-disable camelcase */

/** @type {typeof WebAssembly} */
const _WebAssembly = typeof WebAssembly !== 'undefined'
  ? WebAssembly
  : typeof WXWebAssembly !== 'undefined'
    // eslint-disable-next-line no-undef
    ? WXWebAssembly
    : undefined

function validateImports (imports) {
  if (imports && typeof imports !== 'object') {
    throw new TypeError('imports must be an object or undefined')
  }
}

function fetchWasm (strOrUrl, imports) {
  if (typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
    return _WebAssembly.instantiate(strOrUrl, imports)
  }
  return fetch(strOrUrl)
    .then(response => response.arrayBuffer())
    .then(buffer => _WebAssembly.instantiate(buffer, imports))
}

/**
 * @param {string | URL | BufferSource | WebAssembly.Module} wasmInput
 * @param {WebAssembly.Imports=} imports
 * @returns {Promise<WebAssembly.WebAssemblyInstantiatedSource>}
 */
function load (wasmInput, imports) {
  validateImports(imports)
  imports = imports != null ? imports : {}

  if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
    return _WebAssembly.instantiate(wasmInput, imports)
  }

  if (wasmInput instanceof _WebAssembly.Module) {
    return _WebAssembly.instantiate(wasmInput, imports).then((instance) => {
      return { instance, module: wasmInput }
    })
  }

  if (typeof wasmInput !== 'string' && !(wasmInput instanceof URL)) {
    throw new TypeError('Invalid source')
  }

  let source
  if (typeof _WebAssembly.instantiateStreaming === 'function') {
    let responsePromise
    try {
      responsePromise = fetch(wasmInput)
      source = _WebAssembly.instantiateStreaming(responsePromise, imports).catch(() => {
        return fetchWasm(wasmInput, imports)
      })
    } catch (_) {
      source = fetchWasm(wasmInput, imports)
    }
  } else {
    source = fetchWasm(wasmInput, imports)
  }
  return source
}

/**
 * @param {BufferSource | WebAssembly.Module} wasmInput
 * @param {WebAssembly.Imports=} imports
 * @returns {WebAssembly.WebAssemblyInstantiatedSource}
 */
function loadSync (wasmInput, imports) {
  validateImports(imports)
  imports = imports != null ? imports : {}

  /** @type {WebAssembly.Module} */
  let module

  if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
    module = new _WebAssembly.Module(wasmInput)
  } else if (wasmInput instanceof WebAssembly.Module) {
    module = wasmInput
  } else {
    throw new TypeError('Invalid source')
  }

  const instance = new _WebAssembly.Instance(module, imports)
  const source = { instance, module }

  return source
}

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

  const postMsg = typeof options.postMessage === 'function'
    ? typeof options.postMessage
    : typeof postMessage === 'function'
      ? postMessage
      : function () {}

  return loadFn(wasmInput, importObject, (err, source) => {
    if (err) {
      if (napiModule.childThread) {
        postMsg({
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
    const exportMemory = source.instance.exports.memory instanceof _WebAssembly.Memory
    const importMemory = importObject.env.memory instanceof _WebAssembly.Memory
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
        const exportsProxy = new Proxy({}, {
          get (t, p, r) {
            if (p === 'memory') {
              return memory
            }
            if (p === '_initialize') {
              return noop
            }
            return Reflect.get(instance.exports, p, r)
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
      postMsg({
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
