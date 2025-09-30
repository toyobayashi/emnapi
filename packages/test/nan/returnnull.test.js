'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_returnnull')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.r, 'function');
  assert.strictEqual(bindings.r('a string value'), null);
  assert.strictEqual(bindings.r(), null);
})
