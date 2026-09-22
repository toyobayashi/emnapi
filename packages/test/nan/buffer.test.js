'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_buffer',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.new1, 'function')
    assert.strictEqual(typeof bindings.new2, 'function')
    assert.strictEqual(typeof bindings.new3, 'function')
    assert.strictEqual(typeof bindings.copy, 'function')
    assert.strictEqual(bindings.new1().toString(), 'abcdefghijklmnopqrstuvwxyz')
    assert.strictEqual(bindings.new2().toString(), 'abcdefghijklmnopqrstuvwxyz')
    assert.strictEqual(bindings.new3().toString(), 'abcdefghijklmnopqrstuvwxyz')
    assert.strictEqual(bindings.copy().toString(), 'abcdefghijklmnopqrstuvwxyz')
  }
}
