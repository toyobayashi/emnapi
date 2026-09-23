'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_accessors2',
  test: function (bindings) {
    const settergetter = bindings.create()
    assert.strictEqual(settergetter.prop1, 'this is property 1')
    assert.strictEqual(settergetter.prop2, '')
    settergetter.prop2 = 'setting a value'
    assert.strictEqual(settergetter.prop2, 'setting a value')
    assert.strictEqual(settergetter.log(),
      'New()\n' +
      'Prop1:GETTER(this is property 1)\n' +
      'Prop2:GETTER()\n' +
      'Prop2:SETTER(setting a value)\n' +
      'Prop2:GETTER(setting a value)\n'
    )
  }
}
