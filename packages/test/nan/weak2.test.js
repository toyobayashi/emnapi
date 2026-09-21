'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_weak2',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.hustle, 'function')
  }
}
