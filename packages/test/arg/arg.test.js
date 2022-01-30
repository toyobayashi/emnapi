'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('arg').then((addon) => {
  assert.strictEqual(addon.add(3, 5), 8)
})
