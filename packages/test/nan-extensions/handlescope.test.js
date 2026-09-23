'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_handlescope',
  test: function (binding) {
    assert.deepStrictEqual(binding.escapeTwice(), {
      firstEmpty: false,
      secondEmpty: true
    })
    assert.deepStrictEqual(binding.escapeThroughCaughtException(), { answer: 42 })
  }
}
