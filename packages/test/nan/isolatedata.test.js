'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_isolatedata')
module.exports = p.then(isolatedata => {
  assert.strictEqual(typeof isolatedata.setAndGet, 'function');
  assert.strictEqual(Boolean(isolatedata.setAndGet), true);
})
