/* eslint-disable no-new-object */
/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('newtarget')
module.exports = p.then(binding => {
  class Class extends binding.BaseClass {
    constructor () {
      super()
      this.method()
    }

    method () {
      this.ok = true
    }
  }

  assert.ok(new Class() instanceof binding.BaseClass)
  assert.ok(new Class().ok)
  assert.ok(binding.OrdinaryFunction())
  assert.ok(
    new binding.Constructor(binding.Constructor) instanceof binding.Constructor)
})
