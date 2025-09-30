'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_returnundefined')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.r, 'function');
  assert.strictEqual(bindings.r('a string value'), undefined);
  assert.strictEqual(bindings.r(), undefined);
})
