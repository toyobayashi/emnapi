'use strict'
const tap = require('tap')
const waitForTap = require('./tap-promise')

module.exports = {
  target: 'nan_threadlocal',
  test: function (bindings) {
    return waitForTap(tap.test('thread local storage', bindings.thread_local_storage))
  }
}
