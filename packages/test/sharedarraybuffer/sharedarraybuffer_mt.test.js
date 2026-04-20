/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const util = require('util')
const { join } = require('path')
const { Worker } = require('worker_threads')
const tick = util.promisify(require('../tick'))
const { load } = require('../util')

const loadPromise = load('sharedarraybuffer_mt')

module.exports = loadPromise.then(async (binding) => {
  // Basic external SAB test (same as single-thread)
  {
    let sab = binding.newExternalSharedArrayBuffer()
    assert(util.types.isSharedArrayBuffer(sab))
    assert.strictEqual(sab.byteLength, 1)
    sab = null
    global.gc()
    await tick(10)
    assert.strictEqual(binding.getDeleterCallCount(), 1)
  }

  // Cross-thread refcount test
  const wasmMemoryBuffer = loadPromise.Module.wasmMemory.buffer
  assert(wasmMemoryBuffer instanceof SharedArrayBuffer,
    'wasmMemory.buffer must be SharedArrayBuffer for multi-thread test')

  // Use a helper to create SAB + handle, send to worker, and drop SAB reference
  const handle = await (async function () {
    const { sab, handle } = binding.newExternalSharedArrayBufferWithHandle()
    assert(util.types.isSharedArrayBuffer(sab))
    assert.strictEqual(sab.byteLength, 1)
    assert(handle !== 0, 'handle should not be null')

    // Verify initial refcount is 1
    const refcountView = new Int32Array(wasmMemoryBuffer, handle, 1)
    assert.strictEqual(Atomics.load(refcountView, 0), 1, 'initial refcount should be 1')

    // Spawn worker that will acquire + release
    await new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'worker_mt.js'))
      worker.on('message', (msg) => {
        if (msg.type === 'done') {
          worker.terminate().then(resolve)
        }
      })
      worker.on('error', reject)
      worker.postMessage({ sab, handle, wasmMemoryBuffer })
    })

    // After worker is done, it has acquired (refcount 1→2) then GC'd (refcount 2→1)
    assert.strictEqual(Atomics.load(refcountView, 0), 1,
      'refcount should be 1 after worker released')

    // finalize should NOT have been called yet (main still holds reference)
    assert.strictEqual(binding.getDeleterCallCount(), 1,
      'finalize should not fire while main holds reference')

    return handle
  })()

  // After the async IIFE returns, `sab` is out of scope.
  // Force GC to collect it and trigger FinalizationRegistry.
  global.gc()
  await tick(10)
  global.gc()
  await tick(10)

  // finalize_cb should fire: refcount 1→0
  const refcountView = new Int32Array(wasmMemoryBuffer, handle, 1)
  assert.strictEqual(Atomics.load(refcountView, 0), 0,
    'refcount should be 0 after all references released')
  assert.strictEqual(binding.getDeleterCallCount(), 2,
    'finalize should fire after all references are released')
})
