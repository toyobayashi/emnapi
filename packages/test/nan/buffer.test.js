'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_buffer',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.new1, 'function')
    assert.strictEqual(typeof bindings.new2, 'function')
    assert.strictEqual(typeof bindings.new3, 'function')
    assert.strictEqual(typeof bindings.copy, 'function')
    for (const factory of [bindings.new1, bindings.new2, bindings.new3, bindings.copy]) {
      const buffer = factory()
      assert.strictEqual(Buffer.isBuffer(buffer), true)
      assert.strictEqual(buffer.length, 26)
      assert.strictEqual(buffer.toString(), 'abcdefghijklmnopqrstuvwxyz')
    }
  }
}
