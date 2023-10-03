/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc
const assert = require('assert')
const { load } = require('../util')
const common = require('../common')

module.exports = load('finalizer').then(async test_finalizer => {
  (() => {
    const obj = {}
    test_finalizer.addFinalizer(obj)
  })()

  for (let i = 0; i < 10; ++i) {
    await new Promise((resolve) => {
      setImmediate(resolve)
    })
    global.gc()
    if (test_finalizer.getFinalizerCallCount() === 1) {
      break
    }
  }

  assert(test_finalizer.getFinalizerCallCount() === 1)

  async function runAsyncTests () {
    let js_is_called = false;
    (() => {
      const obj = {}
      test_finalizer.addFinalizerWithJS(obj, () => { js_is_called = true })
    })()
    await common.gcUntil('ensure JS finalizer called',
      () => (test_finalizer.getFinalizerCallCount() === 2))
    assert(js_is_called)
  }
  return runAsyncTests()
})
