const { join } = require('path')
const common = require('./common.js')

const emnapi = require('../runtime')
const context = emnapi.createContext()

function getEntry (targetName) {
  return join(__dirname, `./.cgenbuild/${common.buildType}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : process.env.EMNAPI_TEST_WASI ? 'wasm' : 'js'}`)
}

exports.getEntry = getEntry

function loadPath (request, options) {
  try {
    if (process.env.EMNAPI_TEST_NATIVE) {
      return Promise.resolve(require(request))
    }

    if (process.env.EMNAPI_TEST_WASI) {
      const { WASI } = require('wasi')
      const { createNapiModule } = require('@tybys/emnapi-core')
      const wasi = new WASI()
      const napiModule = createNapiModule({
        context,
        ...(options || {})
      })
      const p = new Promise((resolve, reject) => {
        WebAssembly.instantiate(require('fs').readFileSync(request), {
          wasi_snapshot_preview1: wasi.wasiImport,
          env: napiModule.imports.env,
          napi: napiModule.imports.napi,
          emnapi: napiModule.imports.emnapi
        })
          .then(({ instance }) => {
            wasi.initialize(instance)
            let exports
            try {
              exports = napiModule.init(instance, instance.exports.memory, instance.exports.__indirect_function_table)
            } catch (err) {
              reject(err)
              return
            }
            resolve(exports)
          })
          .catch(reject)
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
