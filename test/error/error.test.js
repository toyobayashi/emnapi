'use strict'
const assert = require('assert')
const { load } = require('../util')

const promise = load('error')

promise.then(mod => {
  const ret = mod.getLastError()
  assert.strictEqual(ret.code, 1)
  assert.strictEqual(ret.msg, 'Invalid argument')

  try {
    mod.throwUndef()
    return Promise.reject(new Error('Should throw undefined'))
  } catch (error) {
    assert.strictEqual(error, undefined)
  }

  try {
    mod.throwError()
    return Promise.reject(new Error('Should throw error'))
  } catch (error) {
    assert.ok(error instanceof Error)
    assert.strictEqual(error.code, 'CODE 1')
    assert.strictEqual(error.message, 'msg 1')
  }

  try {
    mod.throwTypeError()
    return Promise.reject(new Error('Should throw type error'))
  } catch (error) {
    assert.ok(error instanceof TypeError)
    assert.strictEqual(error.code, 'CODE 2')
    assert.strictEqual(error.message, 'msg 2')
  }

  try {
    mod.throwRangeError()
    return Promise.reject(new Error('Should throw range error'))
  } catch (error) {
    assert.ok(error instanceof RangeError)
    assert.strictEqual(error.code, 'CODE 3')
    assert.strictEqual(error.message, 'msg 3')
  }
  let error
  error = mod.createError()
  assert.ok(error instanceof Error)
  assert.strictEqual(error.code, 'CODE 4')
  assert.strictEqual(error.message, 'msg 4')
  assert.strictEqual(mod.isError(error), true)

  error = mod.createTypeError()
  assert.ok(error instanceof TypeError)
  assert.strictEqual(error.code, 'CODE 5')
  assert.strictEqual(error.message, 'msg 5')
  assert.strictEqual(mod.isError(error), true)

  error = mod.createRangeError()
  assert.ok(error instanceof RangeError)
  assert.strictEqual(error.code, 'CODE 6')
  assert.strictEqual(error.message, 'msg 6')
  assert.strictEqual(mod.isError(error), true)
})
