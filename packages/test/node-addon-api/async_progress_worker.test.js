'use strict'

const common = require('./common')
const assert = require('assert')

module.exports = common.runTest(test)

async function test ({ asyncprogressworker }) {
  console.log('await success(asyncprogressworker)')
  await success(asyncprogressworker)
  console.log('await fail(asyncprogressworker)')
  await fail(asyncprogressworker)
  console.log('await signalTest(asyncprogressworker.doMalignTest)')
  await signalTest(asyncprogressworker.doMalignTest)
  console.log('await signalTest(asyncprogressworker.doSignalAfterProgressTest)')
  await signalTest(asyncprogressworker.doSignalAfterProgressTest)
  console.log('done')
}

function success (binding) {
  return new Promise((resolve, reject) => {
    const expected = [0, 1, 2, 3]
    const actual = []
    binding.doWork(expected.length,
      common.mustCall((err) => {
        if (err) {
          reject(err)
        }
      }),
      common.mustCall((_progress) => {
        actual.push(_progress)
        if (actual.length === expected.length) {
          assert.deepEqual(actual, expected)
          resolve()
        }
      }, expected.length)
    )
  })
}

function fail (binding) {
  return new Promise((resolve) => {
    binding.doWork(-1,
      common.mustCall((err) => {
        assert.throws(() => { throw err }, /test error/)
        resolve()
      }),
      common.mustNotCall()
    )
  })
}

function signalTest (bindingFunction) {
  return new Promise((resolve, reject) => {
    bindingFunction(
      common.mustCall((err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      }),
      common.mustCallAtLeast((error, reason) => {
        try {
          assert(!error, reason)
        } catch (e) {
          reject(e)
        }
      }, 1)
    )
  })
}
