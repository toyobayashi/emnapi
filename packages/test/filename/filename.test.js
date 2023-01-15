'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('filename', { filename: __filename }).then(binding => {
  assert.strictEqual(binding.filename(), __filename)
})
