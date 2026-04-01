'use strict'
const { load } = require('../util.mjs')
const test = require('./test.js')

module.exports = load('string').then(test)
