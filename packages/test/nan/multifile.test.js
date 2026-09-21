'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_multifile',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.r, 'function')
    assert.strictEqual(bindings.r('a string value'), 'a string value')
  }
}
