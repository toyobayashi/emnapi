/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const assert = require('assert')

const p = load('objnestedwrap')
module.exports = p.then(addon => {
  // This test verifies that ObjectWrap and napi_ref can be nested and finalized
  // correctly with a non-basic finalizer.
  (() => {
    let obj = new addon.NestedWrap()
    obj = null
    // Silent eslint about unused variables.
    assert.strictEqual(obj, null)
  })()

  return common.gcUntil('object-wrap-ref', () => {
    return addon.getFinalizerCallCount() === 1
  })
})
