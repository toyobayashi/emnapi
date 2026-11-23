/* eslint-disable no-new-object */
/* eslint-disable no-new-wrappers */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util.mjs')

const promise = load('emnapitest')

module.exports = promise.then(test_typedarray => {
  if (!process.env.EMNAPI_TEST_WASI && !process.env.EMNAPI_TEST_WASM32) {
    const mod = test_typedarray.getModuleObject()

    const HEAPU8 = test_typedarray.getModuleProperty('HEAPU8')
    const mem = HEAPU8.buffer
    assert.ok(mem instanceof ArrayBuffer || mem instanceof SharedArrayBuffer)
    assert.strictEqual(mod.HEAPU8, HEAPU8)
  }

  let externalResult = test_typedarray.External()
  assert.ok(externalResult instanceof Uint8Array)
  assert.deepStrictEqual([...externalResult], [0, 1, 2])
  const oldSize = test_typedarray.GetWasmMemorySize()
  test_typedarray.GrowMemory(1)
  const newSize = test_typedarray.GetWasmMemorySize()
  console.log(`memory grow: ${oldSize} --> ${newSize} (+${newSize - oldSize})`)
  if (process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32) {
    console.log(promise.Module.emnapi)
    externalResult = promise.Module.emnapi.syncMemory(false, externalResult)
  } else {
    externalResult = promise.Module.emnapiSyncMemory(false, externalResult)
  }
  assert.deepStrictEqual([...externalResult], [0, 1, 2])

  const buffer = test_typedarray.NullArrayBuffer()
  assert.ok(buffer instanceof Uint8Array)
  assert.strictEqual(buffer.length, 0)
  if (!process.env.EMNAPI_TEST_WASI && !process.env.EMNAPI_TEST_WASM32) {
    assert.strictEqual(buffer.buffer, test_typedarray.getModuleProperty('HEAPU8').buffer)
  }
  assert.notStrictEqual(buffer.buffer.byteLength, 0)

  const [major, minor, patch] = test_typedarray.testGetRuntimeVersion()
  assert.strictEqual(typeof major, 'number')
  assert.strictEqual(typeof minor, 'number')
  assert.strictEqual(typeof patch, 'number')
  console.log(`@emnapi/runtime: v${major}.${minor}.${patch}`)

  assert.strictEqual(test_typedarray.TestUint64(), 10823190267204339845n)

  {
    const ab = test_typedarray.CreateArrayBufferCopy()
    assert.ok(ab instanceof ArrayBuffer)
    assert.strictEqual(ab.byteLength, 4)
    assert.deepStrictEqual([...new Uint8Array(ab)], [10, 20, 30, 40])
  }

  {
    const [abNull, abNonNull] = test_typedarray.CreateArrayBufferCopyZero()
    for (const ab of [abNull, abNonNull]) {
      assert.ok(ab instanceof ArrayBuffer)
      assert.strictEqual(ab.byteLength, 0)
      assert.strictEqual(new Uint8Array(ab).length, 0)
    }
  }

  assert.strictEqual(test_typedarray.CreateArrayBufferCopyInvalidArgs(), true)
  assert.throws(() => test_typedarray.CreateArrayBufferCopyOutOfRange(), RangeError)

  // Regression: copy from upper-half (> 2 GiB) wasm32 memory and, where
  // supported (without Emscripten SAFE_HEAP's 32-bit sbrk overflow at 4 GiB),
  // from a range ending exactly at byte 4294967296 (0x100000000).
  if (process.env.EMNAPI_TEST_4GB && !process.env.MEMORY64 && promise.Module && promise.Module.wasmMemory) {
    const mem = promise.Module.wasmMemory
    const FOUR_GIB = 4294967296
    const canTestExact4GiB = Boolean(process.env.EMNAPI_TEST_WASI || process.env.NODE_ENV === 'production')
    if (canTestExact4GiB && mem.buffer.byteLength < FOUR_GIB) {
      try {
        if (promise.Module.growMemory) {
          promise.Module.growMemory(FOUR_GIB)
        } else {
          mem.grow((FOUR_GIB - mem.buffer.byteLength) / 65536)
        }
      } catch (_) {}
    }
    const start = mem.buffer.byteLength - 4
    new Uint8Array(mem.buffer, start, 4).set([0x11, 0x22, 0x33, 0x44])
    const ab = test_typedarray.CreateArrayBufferCopyAt(start, 4)
    assert.strictEqual(ab.byteLength, 4)
    assert.deepStrictEqual([...new Uint8Array(ab)], [0x11, 0x22, 0x33, 0x44])
  }
})
