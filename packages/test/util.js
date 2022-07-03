const { join } = require('path')
const common = require('./common.js')

function getEntry (targetName) {
  return join(__dirname, `./.cgenbuild/${common.buildType}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : 'js'}`)
}

exports.getEntry = getEntry

function loadPath (request) {
  try {
    const mod = require(request)

    if (typeof mod.default === 'function') {
      const p = new Promise((resolve, reject) => {
        mod.default({
          emnapiRuntime: require('../runtime'),
          onEmnapiInitialized: (err) => {
            if (err) {
              reject(err)
            }
          }
        }).then(({ Module, emnapi }) => {
          p.Module = Module
          p.emnapi = emnapi
          resolve(Module.emnapiExports)
        })
      })
      return p
    } else {
      return Promise.resolve(mod)
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

exports.loadPath = loadPath

exports.load = function (targetName) {
  const request = getEntry(targetName)
  return loadPath(request)
}
