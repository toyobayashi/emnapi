/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc

const assert = require('assert')
const common = require('../common')
const { load } = require('../util')

const p = load('fnwrap')
p.then(test => {
  assert.strictEqual(test.finalizeCount, 0)
  async function runGCTests () {
    (() => {
      const obj = test.createObject(10)
      assert.strictEqual(obj.plusOne(), 11)
      assert.strictEqual(obj.plusOne(), 12)
      assert.strictEqual(obj.plusOne(), 13)
    })()
    await common.gcUntil('test 1', () => (test.finalizeCount === 1));

    (() => {
      const obj2 = test.createObject(20)
      assert.strictEqual(obj2.plusOne(), 21)
      assert.strictEqual(obj2.plusOne(), 22)
      assert.strictEqual(obj2.plusOne(), 23)
    })()
    await common.gcUntil('test 2', () => (test.finalizeCount === 2))
  }
  runGCTests()
})
