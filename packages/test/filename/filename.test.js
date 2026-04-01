'use strict'
const assert = require('assert')
const { load } = require('../util.mjs')

module.exports = load('filename', { filename: __filename }).then(binding => {
  assert.strictEqual(binding.filename(), __filename)
})
