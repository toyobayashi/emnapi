const { join } = require('path')
const common = require('./common.js')

function getEntry (targetName) {
  return join(__dirname, `../.cgenbuild/${common.buildType}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : 'js'}`)
}

exports.getEntry = getEntry

exports.load = function (targetName) {
  const request = getEntry(targetName)
  const mod = require(request)

  return typeof mod.default === 'function' ? mod.default().then(({ Module }) => Module.emnapiExports) : Promise.resolve(mod)
}
