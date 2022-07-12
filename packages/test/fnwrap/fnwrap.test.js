/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc

const assert = require('assert')
const common = require('../common')
const { load } = require('../util')

const supportFinalizer = typeof FinalizationRegistry === 'function'

const p = load('fnwrap')
module.exports = p.then(test => {
  assert.strictEqual(test.finalizeCount, 0)
  async function runGCTests () {
    (() => {
      const obj = test.createObject(10)
      assert.strictEqual(obj.plusOne(), 11)
      assert.strictEqual(obj.plusOne(), 12)
      assert.strictEqual(obj.plusOne(), 13)
      if (!supportFinalizer) obj.dispose()
    })()
    await common.gcUntil('test 1', () => (test.finalizeCount === 1));

    (() => {
      const obj2 = test.createObject(20)
      assert.strictEqual(obj2.plusOne(), 21)
      assert.strictEqual(obj2.plusOne(), 22)
      assert.strictEqual(obj2.plusOne(), 23)
      if (!supportFinalizer) obj2.dispose()
    })()
    await common.gcUntil('test 2', () => (test.finalizeCount === 2))
  }
  return runGCTests().catch(err => {
    console.error(err)
    process.exit(1)
  })
})
