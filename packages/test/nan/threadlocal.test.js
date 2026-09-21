'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_threadlocal',
  test: function (bindings) {
    assert.strictEqual(typeof bindings.thread_local_storage, 'function')
  }
}
