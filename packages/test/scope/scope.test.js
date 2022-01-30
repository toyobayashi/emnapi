/* eslint-disable no-new-object */
/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('scope')
module.exports = p.then(testHandleScope => {
  testHandleScope.NewScope()
  assert.ok(testHandleScope.NewScopeEscape() instanceof Object)

  testHandleScope.NewScopeEscapeTwice()

  assert.throws(
    () => {
      testHandleScope.NewScopeWithException(() => { throw new RangeError() })
    },
    RangeError)
})
