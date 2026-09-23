'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_setcallhandler',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.a, 'function')
    assert.strictEqual(typeof bindings.b, 'function')
    assert.strictEqual(bindings.a()(), 12)
    assert.strictEqual(bindings.b()(), 15)
  }
}
