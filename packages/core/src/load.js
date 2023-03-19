import { load, loadSync } from './util.js'
import { createNapiModule } from './module.js'

function loadNapiModuleImpl (loadFn, userNapiModule, wasmInput, options) {
  options = options == null ? {} : options

  const getMemory = options.getMemory
  const getTable = options.getTable
  if (getMemory != null && typeof getMemory !== 'function') {
    throw new TypeError('options.getMemory is not a function')
  }
  if (getTable != null && typeof getTable !== 'function') {
    throw new TypeError('options.getTable is not a function')
  }

  let napiModule
  const isLoad = typeof userNapiModule === 'object' && userNapiModule !== null
  if (isLoad) {
    if (userNapiModule.loaded) {
      throw new Error('napiModule has already loaded')
    }
    napiModule = userNapiModule
  } else {
    napiModule = createNapiModule(options)
  }

  const wasi = options.wasi
  let importObject = {
    env: napiModule.imports.env,
    napi: napiModule.imports.napi,
    emnapi: napiModule.imports.emnapi,
    wasi: {
      // eslint-disable-next-line camelcase
      'thread-spawn': function __imported_wasi_thread_spawn (startArg, errorOrTid) {
        return napiModule.spawnThread(startArg, errorOrTid)
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

  let onInstantiated
  if (('onInstantiated' in options) && typeof options.onInstantiated === 'function') {
    onInstantiated = options.onInstantiated
  }

  return loadFn(wasmInput, importObject, (err, source) => {
    if (err) {
      throw err
    }

    if (onInstantiated) {
      onInstantiated(source.instance, source.module)
    }

    let instance = source.instance
    const exports = instance.exports

    const exportMemory = 'memory' in exports
    const importMemory = 'memory' in importObject.env
    /** @type {WebAssembly.Memory} */
    const memory = getMemory
      ? getMemory(exports)
      : exportMemory
        ? exports.memory
        : importMemory
          ? importObject.env.memory
          : undefined
    if (!memory) {
      throw new Error('memory is neither exported nor imported')
    }
    const table = getTable ? getTable(exports) : exports.__indirect_function_table
    if (wasi && !exportMemory) {
      instance = {
        exports: Object.assign({}, exports, { memory })
      }
    }
    const module = source.module
    if (wasi) {
      if (napiModule.childThread) {
        // https://github.com/nodejs/help/issues/4102
        const createHandler = function (target) {
          const handlers = [
            'apply',
            'construct',
            'defineProperty',
            'deleteProperty',
            'get',
            'getOwnPropertyDescriptor',
            'getPrototypeOf',
            'has',
            'isExtensible',
            'ownKeys',
            'preventExtensions',
            'set',
            'setPrototypeOf'
          ]
          const handler = {}
          for (let i = 0; i < handlers.length; i++) {
            const name = handlers[i]
            handler[name] = function () {
              const args = Array.prototype.slice.call(arguments, 1)
              args.unshift(target)
              return Reflect[name].apply(Reflect, args)
            }
          }
          return handler
        }
        const handler = createHandler(exports)
        const noop = () => {}
        handler.get = function (target, p, receiver) {
          if (p === 'memory') {
            return memory
          }
          if (p === '_initialize') {
            return noop
          }
          return Reflect.get(exports, p, receiver)
        }
        const exportsProxy = new Proxy(Object.create(null), handler)
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

    napiModule.init({
      instance,
      module,
      memory,
      table
    })

    const ret = { instance, module }
    if (!isLoad) {
      ret.napiModule = napiModule
    }
    return ret
  })
}

function loadCallback (wasmInput, importObject, callback) {
  return load(wasmInput, importObject).then((source) => {
    return callback(null, source)
  }, err => {
    return callback(err)
  })
}

function loadSyncCallback (wasmInput, importObject, callback) {
  let source
  try {
    source = loadSync(wasmInput, importObject)
  } catch (err) {
    return callback(err)
  }
  return callback(null, source)
}

export function loadNapiModule (napiModule, wasmInput, options) {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadNapiModuleImpl(loadCallback, napiModule, wasmInput, options)
}

export function loadNapiModuleSync (napiModule, wasmInput, options) {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadNapiModuleImpl(loadSyncCallback, napiModule, wasmInput, options)
}

export function instantiateNapiModule (wasmInput, options) {
  return loadNapiModuleImpl(loadCallback, undefined, wasmInput, options)
}

export function instantiateNapiModuleSync (wasmInput, options) {
  return loadNapiModuleImpl(loadSyncCallback, undefined, wasmInput, options)
}
