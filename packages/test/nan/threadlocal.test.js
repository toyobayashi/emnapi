'use strict'
const tap = require('tap')

module.exports = {
  target: 'nan_threadlocal',
  test: function (bindings) {
    tap.test('thread local storage', bindings.thread_local_storage)
  }
}
