'use strict'
const assert = require('assert')
const { load } = require('../util.mjs')

module.exports = load('fnfac').then(addon => {
  const fn = addon()
  assert.strictEqual(fn(), 'hello world') // 'hello world'
})
