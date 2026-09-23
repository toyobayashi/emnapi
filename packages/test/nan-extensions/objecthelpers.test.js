'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_objecthelpers',
  test: function (binding) {
    const proto = { inherited: 7 }
    const value = Object.create(proto)
    value.own = 9
    assert.deepStrictEqual(binding.inspect(value), {
      has: true,
      own: false,
      attributes: 0,
      names: ['own', 'inherited'],
      ownNames: ['own']
    })
    value[3] = 'numeric'
    const symbol = Symbol('symbol')
    value[symbol] = 'symbolic'
    assert.deepStrictEqual(binding.inspectKeyKinds(value, symbol), {
      numeric: true,
      symbol: true
    })

    binding.defineReadOnly(value)
    assert.strictEqual(value.locked, 'value')
    assert.strictEqual(Reflect.set(value, 'locked', 'changed'), false)
    assert.strictEqual(Reflect.deleteProperty(value, 'locked'), false)
    assert.strictEqual(binding.deleteKey(value, 'own'), true)
    assert.strictEqual(Object.hasOwn(value, 'own'), false)
    assert.strictEqual(binding.looseEquals(1, '1'), true)

    const child = {}
    assert.strictEqual(binding.setPrototypeForTest(child, proto), true)
    assert.strictEqual(child.inherited, 7)
    assert.strictEqual(binding.callFunction(function (x) { return this.base + x },
      { base: 4 }, 3), 7)
    const instance = binding.callConstructor(function Box (x) { this.x = x }, 11)
    assert.strictEqual(instance.x, 11)

    const throwing = new Proxy({}, {
      has () { throw new Error('has trap') }
    })
    assert.throws(() => binding.inspect(throwing), /has trap/)
  }
}
