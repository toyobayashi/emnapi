'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_nancallback',
  test: async function (bindings) {
    assert.strictEqual(typeof bindings.globalContext, 'function')
    assert.strictEqual(typeof bindings.specificContext, 'function')
    assert.strictEqual(typeof bindings.customReceiver, 'function')
    assert.strictEqual(typeof bindings.compareCallbacks, 'function')
    assert.strictEqual(typeof bindings.callDirect, 'function')
    assert.strictEqual(typeof bindings.callAsFunction, 'function')
    assert.strictEqual(typeof bindings.resetUnset, 'function')
    assert.strictEqual(typeof bindings.resetSet, 'function')
    assert.strictEqual(typeof bindings.callRetval, 'function')

    let called = 0
    bindings.globalContext(() => { called++ })
    bindings.specificContext(() => { called++ })
    bindings.customReceiver(function () {
      assert.strictEqual(this, process)
      called++
    }, process)
    bindings.callDirect(() => { called++ })
    bindings.callAsFunction(() => { called++ })
    assert.strictEqual(called, 5)
    assert.ok(bindings.resetUnset())
    assert.ok(bindings.resetSet(() => {}))
    assert.ok(bindings.callRetval(() => 1))

    const round = Math.round
    const x = param => param + 1
    const y = param => param + 2
    assert.ok(bindings.compareCallbacks(round, Math.round, Math.floor))
    assert.ok(bindings.compareCallbacks(x, x, y))
  }
}
