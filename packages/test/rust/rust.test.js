module.exports = new Promise((resolve, reject) => {
  let wasi
  if (process.env.EMNAPI_TEST_WASI) {
    const { WASI } = require('wasi')
    wasi = new WASI({ /* ... */ })
  }

  const context = require('@tybys/emnapi-runtime').getDefaultContext()

  const { createNapiModule } = require('@tybys/emnapi-core')
  const napiModule = createNapiModule({
    context
  })

  const wasmBuffer = process.env.EMNAPI_TEST_WASI
    ? require('fs').readFileSync(require('path').join(__dirname, './target/wasm32-wasi/release/binding.wasm'))
    : require('fs').readFileSync(require('path').join(__dirname, './target/wasm32-unknown-unknown/release/binding.wasm'))

  WebAssembly.instantiate(wasmBuffer, {
    ...(process.env.EMNAPI_TEST_WASI ? { wasi_snapshot_preview1: wasi.wasiImport } : {}),
    env: {
      ...napiModule.imports.env,
      ...napiModule.imports.napi,
      ...napiModule.imports.emnapi
    }
  }).then(({ instance }) => {
    console.log(instance.exports)
    if (process.env.EMNAPI_TEST_WASI) {
      wasi.initialize(instance)
    }
    const binding = napiModule.init(instance, instance.exports.memory, instance.exports.__indirect_function_table)
    require('assert').strictEqual(binding.sum(1, 2), 3)
    resolve()
  }).catch(reject)
})
