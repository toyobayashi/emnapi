/* eslint-disable no-new-object */
/* eslint-disable no-new-wrappers */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('emnapitest').then(test_typedarray => {
  const mod = test_typedarray.getModuleObject()

  const HEAPU8 = test_typedarray.getModuleProperty('HEAPU8')
  const mem = HEAPU8.buffer
  assert.ok(mem instanceof ArrayBuffer)
  assert.strictEqual(mod.HEAPU8, HEAPU8)

  const externalResult = test_typedarray.External()
  assert.ok(externalResult instanceof Uint8Array)
  assert.strictEqual(externalResult.length, 3)
  assert.strictEqual(externalResult[0], 0)
  assert.strictEqual(externalResult[1], 1)
  assert.strictEqual(externalResult[2], 2)

  const buffer = test_typedarray.NullArrayBuffer()
  assert.ok(buffer instanceof Uint8Array)
  assert.strictEqual(buffer.length, 0)
  assert.strictEqual(buffer.buffer, mem)
  assert.notStrictEqual(buffer.buffer.byteLength, 0)

  const [major, minor, patch] = test_typedarray.testGetEmscriptenVersion()
  assert.strictEqual(typeof major, 'number')
  assert.strictEqual(typeof minor, 'number')
  assert.strictEqual(typeof patch, 'number')
  console.log(`test: Emscripten v${major}.${minor}.${patch}`)
})
