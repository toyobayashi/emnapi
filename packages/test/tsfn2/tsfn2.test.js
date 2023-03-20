/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const assert = require('assert')

async function main () {
  const loadPromise = load('tsfn2', { nodeBinding: require('@emnapi/node-binding') })
  const binding = await loadPromise

  const input = 10
  const count = 3
  const result = input + count
  const progressData = []
  for (let i = 1; i <= count; ++i) {
    progressData.push(input + i)
  }
  const actual = []
  binding.testTSFN(input, count, common.mustCall(function (status, out) {
    console.log(status, out)
    assert.strictEqual(status, 0)
    assert.strictEqual(out, result)
    setImmediate(() => {
      assert.deepStrictEqual(actual, progressData)
    })
  }, 1), common.mustCall(function (current) {
    actual.push(current)
    console.log(current)
  }, count))
  console.log('testTSFN')
}

module.exports = main()
