'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('env').then(mod => {
  assert.strictEqual(mod.i32(), 233)
})
