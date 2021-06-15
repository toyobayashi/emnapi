/* eslint-disable symbol-description */
/* eslint-disable no-new-object */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

load('general').then(test_globals => {
  assert.strictEqual(test_globals.getUndefined(), undefined)
  assert.strictEqual(test_globals.getNull(), null)
}).catch(err => {
  console.error(err)
  process.exit(1)
})
