/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const util = require('util')
const tick = util.promisify(require('../tick'))
const { load } = require('../util')

// eslint-disable-next-line camelcase
const loadPromise = load('sharedarraybuffer')
module.exports = loadPromise.then(async (test_sharedarraybuffer) => {
  {
    const sab = new SharedArrayBuffer(16)
    const ab = new ArrayBuffer(16)
    const obj = {}
    const arr = []

    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(sab), true)
    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(ab), false)
    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(obj), false)
    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(arr), false)
    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(null), false)
    assert.strictEqual(test_sharedarraybuffer.TestIsSharedArrayBuffer(undefined), false)
  }

  // Test node_api_create_sharedarraybuffer
  {
    const sab = test_sharedarraybuffer.TestCreateSharedArrayBuffer(16)
    assert(sab instanceof SharedArrayBuffer)
    assert.strictEqual(sab.byteLength, 16)
  }

  // Test node_api_create_get_sharedarraybuffer_info
  {
    const sab = new SharedArrayBuffer(32)
    const byteLength = test_sharedarraybuffer.TestGetSharedArrayBufferInfo(sab)
    assert.strictEqual(byteLength, 32)
  }

  // Test data access
  {
    const sab = new SharedArrayBuffer(8)
    const result = test_sharedarraybuffer.TestSharedArrayBufferData(sab)
    assert.strictEqual(result, true)

    // Check if data was written correctly
    const view = new Uint8Array(sab)
    for (let i = 0; i < 8; i++) {
      assert.strictEqual(view[i], i % 256)
    }
  }

  // Test data pointer from existing SharedArrayBuffer
  {
    const sab = new SharedArrayBuffer(16)
    const result = test_sharedarraybuffer.TestSharedArrayBufferData(sab)
    assert.strictEqual(result, true)
  }

  // Test zero-length SharedArrayBuffer
  {
    const sab = test_sharedarraybuffer.TestCreateSharedArrayBuffer(0)
    assert(sab instanceof SharedArrayBuffer)
    assert.strictEqual(sab.byteLength, 0)
  }

  // Test invalid arguments
  {
    assert.throws(() => {
      test_sharedarraybuffer.TestGetSharedArrayBufferInfo({})
    }, { name: 'Error', message: 'Invalid argument' })
  }

  // Test node_api_create_external_sharedarraybuffer
  {
    let sab = test_sharedarraybuffer.newExternalSharedArrayBuffer()
    assert(util.types.isSharedArrayBuffer(sab))
    assert.strictEqual(sab.byteLength, 1)
    sab = null
    global.gc()
    await tick(10)
    assert.strictEqual(test_sharedarraybuffer.getDeleterCallCount(), 1)
  }

  // Test emnapiAcquireExternalSharedArrayBuffer refcount (wasm only)
  if (test_sharedarraybuffer.newExternalSharedArrayBufferWithHandle) {
    const acquireFn = process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32
      ? loadPromise.Module.emnapi.acquireExternalSharedArrayBuffer
      : loadPromise.Module.emnapiAcquireExternalSharedArrayBuffer

    ;(function () {
      const { sab, handle } = test_sharedarraybuffer.newExternalSharedArrayBufferWithHandle()
      assert(util.types.isSharedArrayBuffer(sab))
      assert.strictEqual(sab.byteLength, 1)
      assert.strictEqual(typeof handle, 'number')
      assert(handle !== 0, 'handle should not be null')

      // Acquire increases refcount; on same thread, both FinalizationRegistry
      // callbacks fire when the SAB is GC'd, so finalize is still called.
      acquireFn(sab, handle)
    })()

    // Force GC after function scope exits (all local refs are gone)
    global.gc()
    await tick(10)
    // finalize_cb should have been called exactly once more
    assert.strictEqual(test_sharedarraybuffer.getDeleterCallCount(), 2)
  }
})
