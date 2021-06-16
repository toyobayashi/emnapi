'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('objfac').then(addon => {
  const obj1 = addon('hello')
  const obj2 = addon('world')
  assert.strictEqual(`${obj1.msg} ${obj2.msg}`, 'hello world')
})
