'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_callbackinfo',
  test: function (binding) {
    const receiver = { marker: 'ordinary' }
    const ordinary = binding.inspect.call(receiver)
    assert.strictEqual(ordinary.this, receiver)
    assert.strictEqual(ordinary.holder, receiver)
    assert.strictEqual(ordinary.data, 'direct-data')
    assert.strictEqual(ordinary.construct, false)
    assert.strictEqual(ordinary.newTarget, undefined)

    const constructed = new binding.inspect()
    assert.strictEqual(constructed.construct, true)
    assert.strictEqual(constructed.newTarget, binding.inspect)

    const alternate = function Alternate () {}
    const reflected = Reflect.construct(binding.inspect, [], alternate)
    assert.strictEqual(reflected.construct, false)
    assert.strictEqual(reflected.newTarget, undefined)

    const thing = new binding.Thing()
    const child = Object.create(thing)
    const inherited = child.inspect()
    assert.strictEqual(inherited.this, child)
    assert.strictEqual(inherited.holder, binding.Thing.prototype)
    assert.strictEqual(inherited.data, 'prototype-data')
    assert.strictEqual(inherited.construct, false)
    assert.strictEqual(inherited.newTarget, undefined)
  }
}
