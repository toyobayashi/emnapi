'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_symbols')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.key, 'string')
  assert.strictEqual(bindings.key, 'a property')
})
