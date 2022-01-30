/* eslint-disable symbol-description */
/* eslint-disable no-new-object */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('general').then(addon => {
  const testCase = '(41.92 + 0.08);'
  const expected = 42
  const actual = addon.testNapiRun(testCase)

  assert.strictEqual(actual, expected)
  assert.throws(() => addon.testNapiRun({ abc: 'def' }), /string was expected/)
})
