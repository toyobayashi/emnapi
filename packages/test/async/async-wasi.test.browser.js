/* eslint-disable no-undef */
/* eslint-disable camelcase */

import { test } from 'vitest'
import assert from 'assert'

console.log(assert)

test('async-wasi', async function main () {
  const init = async function () {
    const { WASI } = await import('../../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js')
    const { createNapiModule, loadNapiModule } = await import('../../core/dist/emnapi-core.js')
    const { getDefaultContext } = await import('../../runtime/dist/emnapi.js')
    const wasi = new WASI()
    const napiModule = createNapiModule({
      context: getDefaultContext(),
      reuseWorker: {
        size: 4
      },
      waitThreadStart: typeof window === 'undefined' ? 1000 : false,
      onCreateWorker () {
        return new Worker(new URL('../worker.mjs', import.meta.url), { type: 'module' })
      },
    })
    const wasmMemory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })

    const p = new Promise((resolve, reject) => {
      loadNapiModule(napiModule, '../.build/wasm32-wasi-threads/Debug/async.wasm', {
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
  const test_async = await init()

  await new Promise((resolve) => {
    // Successful async execution and completion callback.
    test_async.Test(5, {}, function (err, val) {
      console.log('test_async.Test(5, {}, callback)')
      assert.strictEqual(err, null)
      assert.strictEqual(val, 10)
      resolve()
    })
  })

  await new Promise((resolve) => {
    // Async work item cancellation with callback.
    test_async.TestCancel(() => {
      console.log('test_async.TestCancel(callback)')
      resolve()
    })
  })

  const iterations = 500
  let x = 0
  const workDone = (status) => {
    assert.strictEqual(status, 0)
    if (++x < iterations) {
      setTimeout(() => test_async.DoRepeatedWork(workDone))
    } else {
      console.log(x)
    }
  }
  test_async.DoRepeatedWork(workDone)

  await new Promise((resolve) => {
    setTimeout(resolve, 3000)
  })

  if (typeof postMessage === 'function') {
     postMessage('done')
  }
})
