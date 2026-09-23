'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_interceptor_fallback',
  test: function (binding) {
    const named = binding.createNamed()
    assert.strictEqual(named.fallback, 'named fallback')
    const indexed = binding.createIndexed()
    assert.strictEqual(indexed[7], 'indexed fallback')
  }
}
