/* eslint-disable no-new-object */
/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../../util')

const p = load('n_hello')
module.exports = p.then(addon => {
  assert.strictEqual(addon.hello(), 'world')
})
