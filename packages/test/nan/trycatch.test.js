'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_trycatch')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.r, 'function')
  assert.throws(() => bindings.r(), (e) => e === 'waaa')
})
