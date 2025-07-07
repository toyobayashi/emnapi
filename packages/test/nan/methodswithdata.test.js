'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_methodswithdata',
  skip: true, // TODO
  test: function (bindings) {
    assert.ok(bindings.testWithData())
  
    var settergetter = bindings.create()
    assert.strictEqual(settergetter.prop1, 'this is property 1')
    assert.ok(settergetter.prop2 === '')
    settergetter.prop2 = 'setting a value'
    assert.strictEqual(settergetter.prop2, 'setting a value')
    assert.strictEqual(settergetter.log(),
      'New()\n' +
      'Prop1:GETTER(this is property 1)\n' +
      'Prop2:GETTER()\n' +
      'Prop2:SETTER(setting a value)\n' +
      'Prop2:GETTER(setting a value)\n'
    )
    var derived = Object.create(settergetter)
    assert.strictEqual(derived.prop1, 'this is property 1')
    derived.prop2 = 'setting a new value'
    assert.strictEqual(derived.prop2, 'setting a new value')
    assert.strictEqual(settergetter.prop2, 'setting a new value')
  }
}
