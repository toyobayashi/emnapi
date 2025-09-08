'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_strings')
module.exports = p.then(bindings => {
  var a = bindings.returnUtf8String
  var b = bindings.heapString

  assert.strictEqual(typeof a, 'function')
  assert.strictEqual(typeof b, 'function')

  assert.strictEqual(a('an utf8 strïng'), 'an utf8 strïng')
  assert.strictEqual(b('an utf8 strïng'), 'an utf8 strïng')

  var buf

  /* we check Buffer.alloc rather than Buffer.from because
   * we don't want the base class Uint8Array.from */
  if (typeof(Buffer.alloc) === "function") {
    buf = Buffer.from('hello')
  } else {
    buf = new Buffer('hello')
  }
  assert.strictEqual(bindings.encodeHex(), buf.toString('hex'))
  assert.strictEqual(bindings.encodeUCS2(), 'hello')
})
