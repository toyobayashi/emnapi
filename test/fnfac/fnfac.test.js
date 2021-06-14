'use strict'
const assert = require('assert')
const { load } = require('../util')

load('fnfac').then(addon => {
  const fn = addon()
  assert.strictEqual(fn(), 'hello world') // 'hello world'
}).catch(err => {
  console.error(err)
  process.exit(1)
})
