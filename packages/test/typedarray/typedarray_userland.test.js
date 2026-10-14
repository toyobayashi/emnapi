'use strict'
// Without a FinalizationRegistry, native code owns each copy emnapi makes of
// a JS buffer, and Multiply frees it. When a resizable ArrayBuffer grows, the
// next call must get a new block: emnapi must not write into the block
// native code already freed.
const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

if (browser || typeof ArrayBuffer.prototype.resize !== 'function') {
  module.exports = { skip: true }
} else {
  // before emnapi loads
  delete globalThis.FinalizationRegistry

  const assert = require('assert')
  const { load } = require('../util.mjs')

  module.exports = load('typedarray').then(binding => {
    const rab = new ArrayBuffer(4, { maxByteLength: 64 })
    const u8 = new Uint8Array(rab)
    // each size is longer than the copy the call before it made
    for (const n of [4, 5, 8]) {
      rab.resize(n)
      for (let i = 0; i < n; i++) u8[i] = i + 1
      assert.deepStrictEqual([...binding.Multiply(u8, 2)], Array.from({ length: n }, (_, i) => (i + 1) * 2))
    }
  })
}
