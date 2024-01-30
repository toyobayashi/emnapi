'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util')
// const tick = require('util').promisify(require('../tick'))

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

    // To test this doesn't crash
    binding.invalidObjectAsBuffer({})
  })().then(common.mustCall())

  process.externalBuffer = binding.newExternalBuffer()
  assert.strictEqual(process.externalBuffer.toString(), binding.theText)

  let arrayBuffer
  let typedArray
  let dataView

  arrayBuffer = new ArrayBuffer(1)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), [0])
  new MessageChannel().port1.postMessage(arrayBuffer, [arrayBuffer])
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), [])

  arrayBuffer = new ArrayBuffer(6)
  typedArray = new Uint8Array(arrayBuffer)
  dataView = new DataView(arrayBuffer)
  typedArray.fill(66)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(66))
  typedArray.fill(99)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(99))

  const buffer = Buffer.allocUnsafe(6).fill(66)
  arrayBuffer = buffer.buffer
  typedArray = new Uint8Array(arrayBuffer, buffer.byteOffset, buffer.byteLength)
  dataView = new DataView(arrayBuffer, buffer.byteOffset, buffer.byteLength)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(buffer), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(66))
  buffer.fill(99)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(buffer), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(99))
})
