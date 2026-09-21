'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_weak',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.hustle, 'function')
    assert.strictEqual(typeof bindings.weakExternal, 'function')
    bindings.weakExternal()
  }
}
