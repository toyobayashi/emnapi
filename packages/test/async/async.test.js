/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const assert = require('assert')
const child_process = require('child_process')

async function main () {
  const loadPromise = load('async')
  const test_async = await loadPromise

  const testException = 'test_async_cb_exception'

  // Exception thrown from async completion callback.
  // (Tested in a spawned process because the exception is fatal.)
  if (process.argv[2] === 'child') {
    process.on('uncaughtException', function (ex) {
      // suppress ExitStatus exceptions from showing an error
      if (!(ex instanceof loadPromise.Module.ExitStatus)) {
        throw ex
      }
    })
    test_async.Test(1, {}, common.mustCall(function () {
      throw new Error(testException)
    }))
    return
  }
  const p = child_process.spawnSync(
    process.execPath, [__filename, 'child'])
  assert.ifError(p.error)
  const stderr = p.stderr.toString()
  assert.ok(stderr.includes(testException))

  await new Promise((resolve) => {
    // Successful async execution and completion callback.
    test_async.Test(5, {}, common.mustCall(function (err, val) {
      console.log(11111)
      assert.strictEqual(err, null)
      assert.strictEqual(val, 10)
      process.nextTick(common.mustCall(() => {
        console.log(22222)
        resolve()
      }))
    }))
  })

  await new Promise((resolve) => {
    // Async work item cancellation with callback.
    test_async.TestCancel(common.mustCall(() => {
      console.log(33333)
      resolve()
    }))
  })

  const iterations = 500
  let x = 0
  const workDone = common.mustCall((status) => {
    assert.strictEqual(status, 0)
    if (++x < iterations) {
      setImmediate(() => test_async.DoRepeatedWork(workDone))
    }
  }, iterations)
  test_async.DoRepeatedWork(workDone)

  await new Promise((resolve) => {
    process.once('uncaughtException', common.mustCall(function (err) {
      try {
        throw new Error('should not fail')
      } catch (err) {
        assert.strictEqual(err.message, 'should not fail')
      }
      assert.strictEqual(err.message, 'uncaught')
      resolve()
    }))

    // Successful async execution and completion callback.
    test_async.Test(5, {}, common.mustCall(function () {
      throw new Error('uncaught')
    }))
  })

  await new Promise((resolve) => {
    setTimeout(resolve, 3000)
  })
}

module.exports = main()
