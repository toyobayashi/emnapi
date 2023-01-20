const { join } = require('path')
const common = require('./common.js')

const emnapi = require('../runtime')
const context = emnapi.createContext()

function getEntry (targetName) {
  return join(__dirname, `./.cgenbuild/${common.buildType}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : 'js'}`)
}

exports.getEntry = getEntry

function loadPath (request, options) {
  try {
    const mod = require(request)

    if (process.env.EMNAPI_TEST_NATIVE) {
      return Promise.resolve(mod)
    }

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
