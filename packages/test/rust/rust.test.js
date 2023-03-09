module.exports = new Promise((resolve, reject) => {
  let wasi
  if (process.env.EMNAPI_TEST_WASI) {
    const { WASI } = require('wasi')
    wasi = new WASI({ /* ... */ })
  }

  const context = require('@emnapi/runtime').getDefaultContext()

  const { instantiateNapiModule } = require('@emnapi/core')

  const wasmBuffer = process.env.EMNAPI_TEST_WASI
    ? require('fs').readFileSync(require('path').join(__dirname, './target/wasm32-wasi/release/binding.wasm'))
    : require('fs').readFileSync(require('path').join(__dirname, './target/wasm32-unknown-unknown/release/binding.wasm'))

  instantiateNapiModule(wasmBuffer, {
    context,
    wasi,
    overwriteImports (importObject) {
      importObject.env = {
        ...importObject.env,
        ...importObject.napi,
        ...importObject.emnapi
      }
    }
  }).then(({ napiModule }) => {
    const binding = napiModule.exports
    require('assert').strictEqual(binding.sum(1, 2), 3)
    resolve()
  }).catch(reject)
})
