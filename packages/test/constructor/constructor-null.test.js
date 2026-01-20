/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

// Test passing NULL to object-related Node-APIs.
module.exports = load('constructor').then(({ testNull }) => {
  const expectedResult = {
    envIsNull: 'Invalid argument',
    nameIsNull: 'Invalid argument',
    lengthIsZero: 'napi_ok',
    nativeSideIsNull: 'Invalid argument',
    dataIsNull: 'napi_ok',
    propsLengthIsZero: 'napi_ok',
    propsIsNull: 'Invalid argument',
    resultIsNull: 'Invalid argument'
  }

  assert.deepStrictEqual(testNull.testDefineClass(), expectedResult)
})
