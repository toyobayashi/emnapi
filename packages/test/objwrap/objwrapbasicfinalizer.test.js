/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const assert = require('assert')
const { gcUntil } = require('../gc')

const p = load('objwrapbasicfinalizer')
module.exports = p.then(async addon => {
  // This test verifies that ObjectWrap can be correctly finalized with a node_api_basic_finalizer
  // in the current JS loop tick
  (() => {
    let obj = new addon.MyObject(9)
    obj = null
    // Silent eslint about unused variables.
    assert.strictEqual(obj, null)
  })()

  await gcUntil(() => {
    return addon.getFinalizerCallCount() === 1
  })

  assert.strictEqual(addon.getFinalizerCallCount(), 1)
})
