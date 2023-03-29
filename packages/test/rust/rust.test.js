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
    onInstantiated (instance) {
      for (const sym in instance.exports) {
        if (sym.startsWith('__napi_register__')) {
          instance.exports[sym]()
        }
      }
    },
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
    require('assert').strictEqual(binding.fibonacci(5), 5)
    resolve()
  }).catch(reject)
})
