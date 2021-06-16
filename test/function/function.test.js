/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util')

module.exports = load('function').then(async test_function => {
  function func1 () {
    return 1
  }
  assert.strictEqual(test_function.TestCall(func1), 1)

  function func2 () {
    console.log('hello world!')
    return null
  }
  assert.strictEqual(test_function.TestCall(func2), null)

  function func3 (input) {
    return input + 1
  }
  assert.strictEqual(test_function.TestCall(func3, 1), 2)

  function func4 (input) {
    return func3(input)
  }
  assert.strictEqual(test_function.TestCall(func4, 1), 2)

  assert.strictEqual(test_function.TestName.name, 'Name')
  assert.strictEqual(test_function.TestNameShort.name, 'Name_')
  let called = 0
  let tracked_function = test_function.MakeTrackedFunction(() => { called++ })
  assert(!!tracked_function)
  tracked_function = null

  await common.gcUntil(() => {
    return called === 1
  })

  assert.deepStrictEqual(test_function.TestCreateFunctionParameters(), {
    envIsNull: 'Invalid argument',
    nameIsNull: 'napi_ok',
    cbIsNull: 'Invalid argument',
    resultIsNull: 'Invalid argument'
  })
})
