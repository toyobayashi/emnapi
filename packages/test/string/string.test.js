'use strict'
const { load } = require('../util')
const test = require('./test.js')

module.exports = load('string').then(test)
