/* eslint-disable no-undef */
/* eslint-disable camelcase */

import * as wasmUtil from '../../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js'
import * as emnapiCore from '../../../node_modules/@emnapi/core/dist/emnapi-core.mjs'
import * as emnapi from '../../runtime/dist/emnapi.mjs'

(async function main () {
  const init = function () {
    const { WASI } = wasmUtil
    const { createNapiModule, loadNapiModule } = emnapiCore
    const { getDefaultContext } = emnapi
    const wasi = new WASI()
    const napiModule = createNapiModule({
      context: getDefaultContext(),
      reuseWorker: {
        size: 1,
        strict: true
      },
      onCreateWorker () {
        return new Worker('../worker.mjs', { type: 'module' })
      }
    })
    const wasmMemory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })

    const p = new Promise((resolve, reject) => {
      loadNapiModule(napiModule, '../.build/wasm32-wasi-threads/Debug/trap_in_thread.wasm', {
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
  const binding = await init()
  binding.join()
})()
