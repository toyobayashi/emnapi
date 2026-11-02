'use strict'

const { load } = require('../util.mjs')
const assert = require('assert')
const { Worker, isMainThread, workerData } = require('worker_threads')

const target = 'tsfn_shutdown_reentrant_release'
const options = { nodeBinding: require('@emnapi/node-binding') }

if (isMainThread) {
  const loadPromise = load(target, options)
  module.exports = loadPromise.then(binding => {
    const worker = new Worker(__filename, {
      workerData: { memory: loadPromise.Module && loadPromise.Module.wasmMemory },
      execArgv: [
        ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : [])
      ]
    })

    return new Promise((resolve, reject) => {
      worker.once('error', reject)
      worker.once('exit', code => {
        try {
          assert.strictEqual(code, 0)
          assert.strictEqual(binding.reentered(), true)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
} else {
  module.exports = load(target, {
    ...options,
    memory: workerData.memory
  }).then(binding => {
    assert.ok(binding)
    return new Promise(resolve => setTimeout(resolve, 100))
  })
}
