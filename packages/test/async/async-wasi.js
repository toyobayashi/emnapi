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
      loadNapiModule(napiModule, '../.cgenbuild/Debug/async.wasm', {
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

  const assert = {
    strictEqual (a, b) {
      if (a !== b) {
        throw new Error('')
      }
    }
  }

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
})()
