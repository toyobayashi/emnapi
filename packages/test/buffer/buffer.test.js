'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util')
const tick = require('util').promisify(require('../tick'))

// eslint-disable-next-line camelcase
module.exports = load('buffer').then(async binding => {
  await (async function () {
    assert.strictEqual(binding.newBuffer().toString(), binding.theText)
    assert.strictEqual(binding.newExternalBuffer().toString(), binding.theText)
    assert.strictEqual(binding.getDeleterCallCount(), 0)
    await common.gcUntil(() => binding.getDeleterCallCount() === 1)
    assert.strictEqual(binding.copyBuffer().toString(), binding.theText)

    let buffer = binding.staticBuffer()
    assert.strictEqual(binding.bufferHasInstance(buffer), true)
    assert.strictEqual(binding.bufferInfo(buffer), true)
    buffer = null
    await common.gcUntil(() => binding.getDeleterCallCount() === 2)
  })().then(common.mustCall())

  process.externalBuffer = binding.newExternalBuffer()
  assert.strictEqual(process.externalBuffer.toString(), binding.theText)
})