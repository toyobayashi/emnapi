'use strict'
const assert = require('assert')
const { load } = require('../util')

load('env').then(mod => {
  assert.strictEqual(mod.i32(), 233)
}).catch(err => {
  console.error(err)
  process.exit(1)
})
