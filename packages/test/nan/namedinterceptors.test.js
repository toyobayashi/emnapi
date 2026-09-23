'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_namedinterceptors',
  test: function (bindings) {
    const interceptor = bindings.create()
    assert.strictEqual(interceptor.prop, 'foo')
    interceptor.prop = 'setting a value'
    assert.strictEqual(interceptor.prop, 'setting a value')
    delete interceptor.something
    assert.strictEqual(interceptor.prop, 'goober')
    assert.strictEqual(Object.prototype.hasOwnProperty.call(interceptor, 'thing'), true)
    assert.strictEqual(Object.keys(interceptor)[0], 'value')
  }
}
