'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_private')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.hasPrivateYes, 'function')
  assert.strictEqual(typeof bindings.hasPrivateNo, 'function')
  assert.strictEqual(typeof bindings.deletePrivateNo, 'function')
  assert.strictEqual(typeof bindings.noConflict, 'function')
  assert.ok(bindings.hasPrivateYes())
  assert.ok(bindings.hasPrivateNo())
  assert.ok(bindings.deletePrivateNo())
  assert.ok(bindings.noConflict())
})
