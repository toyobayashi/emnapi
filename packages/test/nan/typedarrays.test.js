'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_typedarrays',
  test: function (bindings) {
    if (typeof Uint8Array !== 'function') return

    const zeros = new Uint8Array(5)
    assert.deepStrictEqual(bindings.ReadU8(zeros), [0, 0, 0, 0, 0])
    const y = zeros[0]
    assert.strictEqual(y, 0)
    assert.deepStrictEqual(bindings.ReadU8(zeros), [0, 0, 0, 0, 0])

    const u8array = new Uint8Array([1, 255, 3])
    assert.deepStrictEqual(bindings.ReadU8(u8array), [1, 255, 3])
    assert.deepStrictEqual(bindings.ReadU8(u8array.subarray(1)), [255, 3])
    assert.deepStrictEqual(bindings.ReadU8(u8array.subarray(0, 2)), [1, 255])
    assert.deepStrictEqual(bindings.ReadU8(u8array.subarray(1, 2)), [255])
    assert.deepStrictEqual(bindings.ReadU8(new Uint8Array(u8array)), [1, 255, 3])
    assert.deepStrictEqual(bindings.ReadU8(new Uint8Array(u8array.subarray(1))), [255, 3])
    assert.deepStrictEqual(bindings.ReadU8(new Uint8Array(u8array.subarray(0, 2))), [1, 255])
    assert.deepStrictEqual(bindings.ReadU8(new Uint8Array(u8array.subarray(1, 2))), [255])
    assert.deepStrictEqual(bindings.ReadU8((new Uint8Array(u8array.buffer)).subarray(1)), [255, 3])

    const i32array = new Int32Array([0, 1, -1, 1073741824, -1073741824])
    assert.deepStrictEqual(bindings.ReadI32(i32array), [0, 1, -1, 1073741824, -1073741824])
    const f32array = new Float32Array([1, -1, Infinity, -Infinity, 0, +0, -0])
    assert.deepStrictEqual(bindings.ReadFloat(f32array), [1, -1, Infinity, -Infinity, 0, +0, -0])
    assert.deepStrictEqual(bindings.ReadFloat(f32array.subarray(1)), [-1, Infinity, -Infinity, 0, +0, -0])
    assert.deepStrictEqual(bindings.ReadFloat(f32array.subarray(0, 4)), [1, -1, Infinity, -Infinity])
    assert.deepStrictEqual(bindings.ReadFloat(f32array.subarray(1, 3)), [-1, Infinity])

    for (const value of [0, 1, null, undefined, 'foobar', [], [1, 2], {}, Uint8Array, new Float32Array(0)]) {
      assert.deepStrictEqual(bindings.ReadU8(value), [])
    }
    assert.deepStrictEqual(bindings.ReadU8({ byteLength: 10000000, byteOffset: 100000, buffer: null }), [])
  }
}
