'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('v8_hello_world').then(binding => {
  console.log(binding)
})
