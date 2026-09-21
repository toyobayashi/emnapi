'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_wrappedobjectfactory',
  test: function (bindings) {
    const obj = bindings.newFactoryObjectInstance(123)
    assert.strictEqual(typeof obj.getValue, 'function')
    assert.strictEqual(typeof obj.getValue(), 'number')
    assert.strictEqual(obj.getValue(), 123)

    const inner = obj.newInnerObject(456)
    assert.strictEqual(inner.getValue(), 456)
  }
}
