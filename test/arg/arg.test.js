'use strict'
const assert = require('assert')
const { load } = require('../util')

load('arg').then((addon) => {
  assert.strictEqual(addon.add(3, 5), 8)
})
