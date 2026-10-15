'use strict'
// Without a FinalizationRegistry, native code owns each copy emnapi makes of
// a JS buffer. A shrink seen by a get-info call drops the bytes past the new
// length from the copy here too, and a get-info call after the buffer grew
// back gives native code the bytes JS has.
const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

if (browser || typeof ArrayBuffer.prototype.resize !== 'function') {
  module.exports = { skip: true }
} else {
  // before emnapi loads
  delete globalThis.FinalizationRegistry

  const assert = require('assert')
  const { load } = require('../util.mjs')

  module.exports = load('buffer').then(binding => {
    // emnapi_sync_memory is wasm only
    if (!binding.syncMemory) return
    for (const viewOf of [(b) => b, (b) => new Uint8Array(b)]) {
      const rab = new ArrayBuffer(16, { maxByteLength: 4096 })
      new Uint8Array(rab).fill(0xaa)
      binding.getMemoryDataAsArray(viewOf(rab))
      rab.resize(2)
      assert.deepStrictEqual(binding.getMemoryDataAsArray(viewOf(rab)), [0xaa, 0xaa])
      rab.resize(16)
      binding.syncMemory(false, viewOf(rab), -1)
      assert.deepStrictEqual([...new Uint8Array(rab)], [0xaa, 0xaa, ...Array(14).fill(0)],
        'sync copied bytes the shrink dropped')
      assert.throws(() => binding.syncMemory(false, viewOf(rab), 16), RangeError)
      assert.deepStrictEqual(binding.getMemoryDataAsArray(viewOf(rab)), [0xaa, 0xaa, ...Array(14).fill(0)],
        'native code got bytes the shrink dropped')
    }
  })
}
