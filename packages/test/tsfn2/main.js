/* eslint-disable camelcase */
'use strict'
const common = require('../common')
const assert = require('assert')

module.exports = async function main (loadPromise) {
  const binding = await loadPromise

  const input = 10
  const count = 3

  // Growing the memory inside the FIRST progress callback makes the growth
  // span the views cached by the TSFN dispatch/enqueue machinery while a
  // drain is in flight.
  await new Promise((resolve) => {
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
      resolve()
    }, 1), common.mustCall(function (current) {
      actual.push(current)
      console.log(current)
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
  })

  // A progress callback that throws must not leave the TSFN dispatch state
  // stuck: the remaining queued calls and the completion must still arrive.
  // The raw mode dispatches the JS function directly (no native call_js),
  // so the throw propagates through the dispatch loop instead of the
  // pending-exception machinery.
  await new Promise((resolve) => {
    let calls = 0
    // the JS threadsafe-function dispatch rethrows the callback exception to
    // the event loop after re-arming (it surfaces as an uncaughtException);
    // the native (C) implementation linked on the pthread lanes routes it
    // through the pending-exception machinery instead, so the hook must
    // tolerate the exception arriving either way
    const onUncaughtException = (err) => {
      assert.strictEqual(err.message, 'tsfn2 progress throw')
    }
    process.on('uncaughtException', onUncaughtException)
    binding.testTSFN(input, count, common.mustCall(function (status, out) {
      console.log('raw', status, out)
      process.removeListener('uncaughtException', onUncaughtException)
      assert.strictEqual(status, 0)
      assert.strictEqual(out, input + count)
      assert.strictEqual(calls, count)
      resolve()
    }, 1), common.mustCall(function () {
      calls++
      console.log('raw progress', calls)
      if (calls === 1) {
        throw new Error('tsfn2 progress throw')
      }
    }, count), true)
  })
}
