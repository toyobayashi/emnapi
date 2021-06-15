/* eslint-disable no-new-object */
/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../../util')

const p = load('n_hello')
p.then(addon => {
  assert.strictEqual(addon.hello(), 'world')
}).catch(err => {
  console.error(err)
  process.exit(1)
})
