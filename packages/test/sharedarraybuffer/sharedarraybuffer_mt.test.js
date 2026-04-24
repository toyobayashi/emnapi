/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const util = require('util')
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
  await (async function () {
    const { sab, handle } = binding.newExternalSharedArrayBufferWithHandle()
    assert(util.types.isSharedArrayBuffer(sab))
    assert.strictEqual(sab.byteLength, 1)
    assert(handle !== 0, 'handle should not be null')

    const threadResult = binding.acquireAndReleaseExternalSharedArrayBufferInThread(handle)
    assert.deepStrictEqual(threadResult, {
      refcountAfterAcquire: 2,
      refcountAfterRelease: 1
    })

    // finalize should NOT have been called yet because the main thread still holds SAB.
    assert.strictEqual(binding.getDeleterCallCount(), 1,
      'finalize should not fire while main holds reference')
  })()

  // After the async IIFE returns, `sab` is out of scope. Force GC so the
  // original JS-owned reference releases the final native refcount.
  global.gc()
  await tick(10)
  global.gc()
  await tick(10)

  assert.strictEqual(binding.getDeleterCallCount(), 2,
    'finalize should fire after all references are released')
})
