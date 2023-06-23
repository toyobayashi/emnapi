/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc
const assert = require('assert')
const { load } = require('../util')
const common = require('../common')

module.exports = load('finalizer').then(async test_finalizer => {
  function addFinalizer () {
    // Define obj in a function context to let it GC-collected.
    const obj = {}
    test_finalizer.addFinalizer(obj)
  }

  addFinalizer()

  await common.gcUntil('test JS finalizer getFinalizerCallCount === 1',
    () => (test_finalizer.getFinalizerCallCount() === 1))
  /* for (let i = 0; i < 1000; ++i) {
    global.gc()
    if (test_finalizer.getFinalizerCallCount() === 1) {
      break
    }
  }

  assert.strictEqual(test_finalizer.getFinalizerCallCount(), 1)  */

  async function runAsyncTests () {
    let js_is_called = false;
    (() => {
      const obj = {}
      test_finalizer.addFinalizerWithJS(obj, () => { js_is_called = true })
    })()
    await common.gcUntil('test JS finalizer',
      () => (test_finalizer.getFinalizerCallCount() === 2))
    assert(js_is_called)
  }
  return runAsyncTests()
})
