/* eslint-disable camelcase */
'use strict'
const common = require('../common')
const assert = require('assert')

module.exports = async function main (loadPromise) {
  const binding = await loadPromise

  const input = 10
  const count = 3
  const result = input + count
  const progressData = []
  for (let i = 1; i <= count; ++i) {
    progressData.push(input + i)
  }
  const actual = []
  let grown = false
  binding.testTSFN(input, count, common.mustCall(function (status, out) {
    console.log(status, out)
    assert.strictEqual(status, 0)
    assert.strictEqual(out, result)
    assert.deepStrictEqual(actual, progressData)
  }, 1), common.mustCall(function (current) {
    actual.push(current)
    console.log(current)
    // grow inside the FIRST progress callback so the growth spans views
    // cached by the TSFN dispatch/enqueue machinery while a drain is in
    // flight
    if (!grown) {
      grown = true
      const wasmMemory = loadPromise.Module && loadPromise.Module.wasmMemory
      if (wasmMemory && wasmMemory.buffer instanceof ArrayBuffer) {
        // Module.growMemory handles the index type of the memory
        // (wasmMemory.grow(1) throws on i64-indexed MEMORY64 memories)
        if (loadPromise.Module.growMemory) {
          loadPromise.Module.growMemory(wasmMemory.buffer.byteLength + 65536)
        } else {
          wasmMemory.grow(1)
        }
      }
    }
  }, count))
  console.log('testTSFN')
}
