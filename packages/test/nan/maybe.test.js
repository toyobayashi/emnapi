'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_maybe')
module.exports = p.then(bindings => {
  assert.strictEqual(bindings.test(), true);
})
