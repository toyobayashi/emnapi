'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_returnvalue')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.r, 'function');
  assert.strictEqual(typeof bindings.p, 'function');
  assert.strictEqual(typeof bindings.q, 'function');
  assert.strictEqual(typeof bindings.u, 'function');
  assert.strictEqual(bindings.r('a string value'), 'a string value');
  assert.strictEqual(bindings.r(), 'default');
  assert.ok(bindings.p());
  assert.ok(bindings.q());
  assert.strictEqual(bindings.u(), 0x80000000);
})
