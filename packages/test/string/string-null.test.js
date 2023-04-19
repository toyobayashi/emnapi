'use strict'
const { load } = require('../util')
const assert = require('assert')

module.exports = load('string').then(({ testNull }) => {
  const expectedResult = {
    envIsNull: 'Invalid argument',
    stringIsNullNonZeroLength: 'Invalid argument',
    stringIsNullZeroLength: 'napi_ok',
    resultIsNull: 'Invalid argument'
  }

  assert.deepStrictEqual(expectedResult, testNull.test_create_latin1())
  assert.deepStrictEqual(expectedResult, testNull.test_create_utf8())
  assert.deepStrictEqual(expectedResult, testNull.test_create_utf16())
})
