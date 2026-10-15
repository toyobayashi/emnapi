'use strict'
const assert = require('assert')
const { load } = require('../util.mjs')

module.exports = load('v8_array_buffer').then(async binding => {
  const data = Uint8Array.from({ length: 8 }, (_, i) => i + 1)
  assert.deepStrictEqual([...binding.copyContents(data, 3)], [1, 2, 3])
  assert.deepStrictEqual([...binding.copyContents(new Uint8Array(data.buffer, 2, 4), 16)], [3, 4, 5, 6])

  // CopyContents reads the copy of the buffer that GetBackingStore made in
  // wasm memory. A growable SharedArrayBuffer can grow after that copy was
  // made (another thread can grow it at any time; here an own byteLength
  // accessor grows it when the view's length is read), and CopyContents must
  // not read past the copy
  const typedArrayByteLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get
  const growables = []
  if (typeof SharedArrayBuffer === 'function' && typeof SharedArrayBuffer.prototype.grow === 'function') {
    growables.push(['SharedArrayBuffer', new SharedArrayBuffer(4, { maxByteLength: 64 }), (b) => b.grow(64)])
  }
  if (typeof ArrayBuffer.prototype.resize === 'function') {
    growables.push(['ArrayBuffer', new ArrayBuffer(4, { maxByteLength: 64 }), (b) => b.resize(64)])
  }
  for (const [kind, buf, grow] of growables) {
    new Uint8Array(buf).fill(1)
    const view = new Uint8Array(buf, 1)
    Object.defineProperty(view, 'byteLength', {
      get () {
        grow(buf)
        return typedArrayByteLength.call(this)
      }
    })
    assert.deepStrictEqual([...binding.copyContents(view, 64)], [1, 1, 1], kind)
  }
})
