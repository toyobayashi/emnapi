/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util')

module.exports = load('promise').then(async test_promise => {
// A resolution
  {
    const expected_result = 42
    const promise = test_promise.createPromise()
    const p = promise.then(
      common.mustCall(function (result) {
        assert.strictEqual(result, expected_result)
      }),
      common.mustNotCall())
    test_promise.concludeCurrentPromise(expected_result, true)
    await p
  }

  // A rejection
  {
    const expected_result = 'It\'s not you, it\'s me.'
    const promise = test_promise.createPromise()
    const p = promise.then(
      common.mustNotCall(),
      common.mustCall(function (result) {
        assert.strictEqual(result, expected_result)
      }))
    test_promise.concludeCurrentPromise(expected_result, false)
    await p
  }

  // Chaining
  {
    const expected_result = 'chained answer'
    const promise = test_promise.createPromise()
    const p = promise.then(
      common.mustCall(function (result) {
        assert.strictEqual(result, expected_result)
      }),
      common.mustNotCall())
    test_promise.concludeCurrentPromise(Promise.resolve('chained answer'), true)
    await p
  }

  const promiseTypeTestPromise = test_promise.createPromise()
  assert.strictEqual(test_promise.isPromise(promiseTypeTestPromise), true)
  test_promise.concludeCurrentPromise(undefined, true)

  // eslint-disable-next-line prefer-promise-reject-errors
  const rejectPromise = Promise.reject(-1)
  const expected_reason = -1
  assert.strictEqual(test_promise.isPromise(rejectPromise), true)
  const p = rejectPromise.catch((reason) => {
    assert.strictEqual(reason, expected_reason)
  })
  await p

  assert.strictEqual(test_promise.isPromise(2.4), false)
  assert.strictEqual(test_promise.isPromise('I promise!'), false)
  assert.strictEqual(test_promise.isPromise(undefined), false)
  assert.strictEqual(test_promise.isPromise(null), false)
  assert.strictEqual(test_promise.isPromise({}), false)
})
