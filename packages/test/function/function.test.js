/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util.mjs')

const loadPromise = load('function')

module.exports = loadPromise.then(async test_function => {
  function func1 () {
    return 1
  }
  assert.strictEqual(test_function.TestCall(func1), 1)

  function func2 () {
    console.log('hello world!')
    return null
  }
  assert.strictEqual(test_function.TestCall(func2), null)

  function func3 (input) {
    return input + 1
  }
  assert.strictEqual(test_function.TestCall(func3, 1), 2)

  function func4 (input) {
    return func3(input)
  }
  assert.strictEqual(test_function.TestCall(func4, 1), 2)

  const wasmMemory = loadPromise.Module && loadPromise.Module.wasmMemory
  if (wasmMemory && wasmMemory.buffer instanceof ArrayBuffer) {
    assert.strictEqual(test_function.TestCall(() => {
      // Module.growMemory handles the index type of the memory
      // (wasmMemory.grow(1) throws on i64-indexed MEMORY64 memories)
      if (loadPromise.Module.growMemory) {
        loadPromise.Module.growMemory(wasmMemory.buffer.byteLength + 65536)
      } else {
        wasmMemory.grow(1)
      }
      return 3
    }), 3)
  }

  assert.strictEqual(test_function.TestName.name, 'Name')
  assert.strictEqual(test_function.TestNameShort.name, 'Name_')
  let called = 0
  let tracked_function = test_function.MakeTrackedFunction(() => { called++ })
  assert(!!tracked_function)
  tracked_function = null

  await common.gcUntil(() => {
    return called === 1
  })

  assert.deepStrictEqual(test_function.TestCreateFunctionParameters(), {
    envIsNull: 'Invalid argument',
    nameIsNull: 'napi_ok',
    cbIsNull: 'Invalid argument',
    resultIsNull: 'Invalid argument'
  })

  assert.strictEqual(test_function.TestCreateFunctionKeyword().name, 'catch')
})
