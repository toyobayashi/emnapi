/* eslint-disable no-undef */
/* eslint-disable camelcase */
if (typeof self !== 'undefined') {
  importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
  importScripts('../../core/dist/emnapi-core.js')
  importScripts('../../runtime/dist/emnapi.js')
}

;(async function main () {
  const init = function () {
    const { WASI } = wasmUtil
    const { createNapiModule, loadNapiModule } = emnapiCore
    const { getDefaultContext } = emnapi
    const wasi = new WASI()
    const napiModule = createNapiModule({
      context: getDefaultContext(),
      reuseWorker: true,
      onCreateWorker () {
        return new Worker('../worker.js')
      }
    })
    const wasmMemory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })

    const p = new Promise((resolve, reject) => {
      loadNapiModule(napiModule, '../.build/wasm32-wasi-threads/Debug/pool.wasm', {
        wasi,
        overwriteImports (importObject) {
          importObject.env.memory = wasmMemory
        }
      }).then(() => {
        resolve(napiModule.exports)
      }).catch(reject)
    })
    p.Module = napiModule
    return p
  }
  const A = await init()

  await Promise.all(Array.from({ length: 4 }, () => A.async_method()))
  console.log('done')
})()
