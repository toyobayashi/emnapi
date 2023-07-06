/* eslint-disable symbol-description */
/* eslint-disable no-new-object */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('jspi').then(async addon => {
  const input = 33
  const promise = new Promise((resolve) => {
    setTimeout(() => {
      resolve(input)
    }, 1000)
  })
  const result = await addon.test(promise)
  assert.strictEqual(result, input * 2)
})
