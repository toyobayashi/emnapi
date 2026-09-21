const assert = require('assert')

module.exports = {
  target: 'nan_settemplate',
  test: function (bindings) {
    let r = new bindings.MyObject()
    assert.strictEqual(typeof r, 'object')
    r = Object.getPrototypeOf(r)
    assert.strictEqual(typeof r, 'object')
    assert.strictEqual(typeof r.prototypeProp, 'string')
    assert.strictEqual(r.prototypeProp, 'a prototype property')

    r = new bindings.MyObject()
    assert.strictEqual(typeof r, 'object')
    assert.strictEqual(typeof r.instanceProp, 'string')
    assert.strictEqual(r.instanceProp, 'an instance property')

    r = new bindings.MyObject()
    assert.strictEqual(r.none, 'none')

    r = new bindings.MyObject()
    assert.strictEqual(r.readOnly, 'readOnly')
    try {
      r.readOnly = 'changed'
    } catch (_) {}
    assert.strictEqual(r.readOnly, 'readOnly')

    r = new bindings.MyObject()
    assert.strictEqual(r.dontEnum, 'dontEnum')
    assert.strictEqual(r.propertyIsEnumerable('dontEnum'), false)

    r = new bindings.MyObject()
    assert.strictEqual(r.dontDelete, 'dontDelete')
    try {
      delete r.dontDelete
    } catch (_) {}
    assert.strictEqual(r.dontDelete, 'dontDelete')
  }
}
