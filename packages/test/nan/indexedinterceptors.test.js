'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_indexedinterceptors',
  test: function (bindings) {
    const interceptor = bindings.create()
    assert.strictEqual(interceptor[2], 'bar')
    interceptor[0] = 'setting a value'
    assert.strictEqual(interceptor[0], 'setting a value')
    delete interceptor[0]
    assert.strictEqual(interceptor[0], 'goober')
    assert.strictEqual(Object.prototype.hasOwnProperty.call(interceptor, 1), true)
    assert.strictEqual(Object.keys(interceptor)[0], '42')
  }
}
