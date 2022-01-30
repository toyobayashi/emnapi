'use strict'
const assert = require('assert')
const { load } = require('../util')

const promise = load('bigint')

/*
0n
[]
0n
[]
1n
[1]
-1n
[1]
100n
[100]
2121n
[2121]
-1233n
[1233]
986583n
[986583]
-976675n
[976675]
98765432213456789876546896323445679887645323232436587988766545658n
[1081160290208438010, 6353857413966178407, 2137532229865108125, 15734241]
-4350987086545760976737453646576078997096876957864353245245769809n
[2249227439184578641, 8929859034951574840, 4303658240311279431, 693152]
*/

module.exports = promise.then(mod => {
  const {
    IsLossless,
    TestInt64,
    TestUint64,
    TestWords,
    CreateTooBigBigInt,
    MakeBigIntWordsThrow
  } = mod;

  ([
    0n,
    -0n,
    1n,
    -1n,
    100n,
    2121n,
    -1233n,
    986583n,
    -976675n,
    98765432213456789876546896323445679887645323232436587988766545658n,
    -4350987086545760976737453646576078997096876957864353245245769809n
  ]).forEach((num) => {
    if (num > -(2n ** 63n) && num < 2n ** 63n) {
      assert.strictEqual(TestInt64(num), num)
      assert.strictEqual(IsLossless(num, true), true)
    } else {
      assert.strictEqual(IsLossless(num, true), false)
    }

    if (num >= 0 && num < 2n ** 64n) {
      assert.strictEqual(TestUint64(num), num)
      assert.strictEqual(IsLossless(num, false), true)
    } else {
      assert.strictEqual(IsLossless(num, false), false)
    }

    const bi = TestWords(num)
    assert.strictEqual(bi, num)
    console.log(bi)
  })

  assert.throws(CreateTooBigBigInt, {
    name: 'Error',
    message: 'Invalid argument'
  })

  // Test that we correctly forward exceptions from the engine.
  assert.throws(MakeBigIntWordsThrow, {
    name: 'RangeError',
    message: 'Maximum BigInt size exceeded'
  })
})
