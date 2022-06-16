/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const assert = require('assert')
const child_process = require('child_process')

async function main () {
  const test_async = await load('async')

  const testException = 'test_async_cb_exception'

  // Exception thrown from async completion callback.
  // (Tested in a spawned process because the exception is fatal.)
  if (process.argv[2] === 'child') {
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
    console.log(status)
    if (++x < iterations) {
      setImmediate(() => test_async.DoRepeatedWork(workDone))
    }
  }, iterations)
  test_async.DoRepeatedWork(workDone)

  await new Promise((resolve) => {
    setTimeout(resolve, 4000)
  })
}

module.exports = main()
