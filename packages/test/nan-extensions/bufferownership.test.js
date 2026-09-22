'use strict'
const assert = require('assert')
const common = require('../common')
const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

module.exports = {
  target: 'nan_ext_bufferownership',
  test: async function (binding) {
    let adopted = binding.adopted()
    assert.strictEqual(adopted.toString(), 'portable-buffer')
    assert.strictEqual(binding.freeCount(), 0)

    const copied = binding.copied()
    const copiedValue = copied.toString()
    binding.mutateSource()
    assert.strictEqual(copied.toString(), copiedValue)

    adopted = null
    if (!browser && typeof FinalizationRegistry === 'function') {
      await common.gcUntil('adopted buffer finalizer', () => binding.freeCount() === 1)
      assert.strictEqual(binding.hintMatches(), true)
    }
    assert.strictEqual(binding.freeCount() <= 1, true)
  }
}
