/* eslint-disable no-new-object */
/* eslint-disable no-new-wrappers */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('date').then(test_date => {
  const dateTypeTestDate = test_date.createDate(1549183351)
  assert.strictEqual(test_date.isDate(dateTypeTestDate), true)

  assert.strictEqual(test_date.isDate(new Date(1549183351)), true)

  assert.strictEqual(test_date.isDate(2.4), false)
  assert.strictEqual(test_date.isDate('not a date'), false)
  assert.strictEqual(test_date.isDate(undefined), false)
  assert.strictEqual(test_date.isDate(null), false)
  assert.strictEqual(test_date.isDate({}), false)

  assert.strictEqual(test_date.getDateValue(new Date(1549183351)), 1549183351)
})
