'use strict'
const assert = require('assert')
const { load } = require('../util')

load('function').then(mod => {
  assert.strictEqual(mod.anonymous.name, '')
  assert.strictEqual(mod.fn.name, 'fnName')
})
