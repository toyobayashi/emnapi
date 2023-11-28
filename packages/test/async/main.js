/* eslint-disable camelcase */
'use strict'
const common = require('../common')
const assert = require('assert')
const child_process = require('child_process')

module.exports = async function main (loadPromise, __filename) {
  const test_async = await loadPromise

  const testException = 'test_async_cb_exception'

  // Exception thrown from async completion callback.
  // (Tested in a spawned process because the exception is fatal.)
  if (process.argv[2] === 'child') {
    if (!process.env.EMNAPI_TEST_NATIVE) {
      process.on('uncaughtException', function (ex) {
        // suppress ExitStatus exceptions from showing an error
        if (!loadPromise.Module || !loadPromise.Module.ExitStatus || !(ex instanceof loadPromise.Module.ExitStatus)) {
          throw ex
        }
      })
    }
    test_async.Test(1, {}, common.mustCall(function () {
      throw new Error(testException)
    }))
    return
  }
  const p = child_process.spawnSync(
    process.execPath, [
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
      ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
      __filename,
      'child'
    ])
  assert.ifError(p.error)
  const stderr = p.stderr.toString()
  assert.ok(stderr.includes(testException))

  await new Promise((resolve) => {
    // Successful async execution and completion callback.
    test_async.Test(5, {}, common.mustCall(function (err, val) {
      console.log('test_async.Test(5, {}, callback)')
      assert.strictEqual(err, null)
      assert.strictEqual(val, 10)
      process.nextTick(common.mustCall(() => {
        console.log('process.nextTick(callback)')
        resolve()
      }))
    }))
  })

  await new Promise((resolve) => {
    // Async work item cancellation with callback.
    test_async.TestCancel(common.mustCall(() => {
      console.log('test_async.TestCancel(callback)')
      resolve()
    }))
  })

  await new Promise((resolve) => {
    const iterations = 500
    let x = 0
    const workDone = common.mustCall((status) => {
      assert.strictEqual(status, 0)
      if (++x < iterations) {
        setImmediate(() => test_async.DoRepeatedWork(workDone))
      } else {
        resolve()
      }
    }, iterations)
    test_async.DoRepeatedWork(workDone)
  })

  await new Promise((resolve) => {
    process.once('uncaughtException', common.mustCall(function (err) {
      try {
        throw new Error('should not fail')
      } catch (err) {
        assert.strictEqual(err.message, 'should not fail')
      }
      assert.strictEqual(err.message, 'uncaught')
      console.log('process.once("uncaughtException", callback): ' + err.message)
      resolve()
    }))

    // Successful async execution and completion callback.
    test_async.Test(5, {}, common.mustCall(function () {
      throw new Error('uncaught')
    }))
  })

  process.exitCode = 0
}
