'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_objectwraphandle',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.MyObject, 'function')

    const obj = new bindings.MyObject(10)
    assert.strictEqual(typeof obj.getHandle, 'function')
    assert.strictEqual(typeof obj.getHandleConst, 'function')
    assert.strictEqual(typeof obj.getValue, 'function')
    assert.strictEqual(typeof obj.getHandle(), 'object')
    assert.strictEqual(typeof obj.getHandleConst(), 'object')
    assert.strictEqual(typeof obj.getValue(), 'number')

    const derived = Object.create(obj)
    assert.ok(derived instanceof bindings.MyObject)
    assert.throws(() => derived.getValue())
  }
}
