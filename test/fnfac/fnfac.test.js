'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('fnfac').then(addon => {
  const fn = addon()
  assert.strictEqual(fn(), 'hello world') // 'hello world'
})
