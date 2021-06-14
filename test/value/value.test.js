'use strict'
const assert = require('assert')
const { load } = require('../util')

// eslint-disable-next-line camelcase
load('value').then(mod => {
  assert.strictEqual(mod.i32(), 996)
  assert.strictEqual(mod.utf8(), 'utf8')
  assert.deepStrictEqual(mod.array(), [])
  assert.ok(mod.arrayWithLength().length === 6)
  assert.strictEqual(mod.symbol().toString(), 'Symbol(symbol)')
  assert.strictEqual(mod.undef(), undefined)
  assert.strictEqual(mod.nil(), null)
  assert.strictEqual(mod.bool(true), true)
  assert.strictEqual(mod.bool(false), false)
  assert.strictEqual(mod.global(), global)
  assert.strictEqual(mod.double(), 9.96)
  assert.strictEqual(mod.getDouble(Math.PI), Math.PI + 1)
  assert.strictEqual(mod.getVersion(), 7)
  assert.strictEqual(mod.uint32(), 4294967295)
  assert.strictEqual(mod.getUint32(4294967295), 0)
  assert.strictEqual(mod.getInt32(996), 997)

  // Both V8 and ChakraCore return a sentinel value of `0x8000000000000000` when
  // the conversion goes out of range, but V8 treats it as unsigned in some cases.
  const RANGEERROR_POSITIVE = Math.pow(2, 63)
  const RANGEERROR_NEGATIVE = -Math.pow(2, 63)

  // Test zero
  testInt64(mod, 0.0, 0)
  testInt64(mod, -0.0, 0)

  // Test min/max safe integer range
  testInt64(mod, Number.MIN_SAFE_INTEGER)
  testInt64(mod, Number.MAX_SAFE_INTEGER)

  // Test within int64_t range (with precision loss)
  testInt64(mod, -Math.pow(2, 63) + (Math.pow(2, 9) + 1))
  testInt64(mod, Math.pow(2, 63) - (Math.pow(2, 9) + 1))

  // Test min/max double value
  testInt64(mod, -Number.MIN_VALUE, 0)
  testInt64(mod, Number.MIN_VALUE, 0)
  testInt64(mod, -Number.MAX_VALUE, RANGEERROR_NEGATIVE)
  testInt64(mod, Number.MAX_VALUE, RANGEERROR_POSITIVE)

  // Test outside int64_t range
  testInt64(mod, -Math.pow(2, 63) + (Math.pow(2, 9)), RANGEERROR_NEGATIVE)
  testInt64(mod, Math.pow(2, 63) - (Math.pow(2, 9)), RANGEERROR_POSITIVE)

  // Test non-finite numbers
  testInt64(mod, Number.POSITIVE_INFINITY, 0)
  testInt64(mod, Number.NEGATIVE_INFINITY, 0)
  testInt64(mod, Number.NaN, 0)
})

function testInt64 (mod, input, expected = input) {
  assert.strictEqual(mod.TestInt64Truncation(input), expected)
}
