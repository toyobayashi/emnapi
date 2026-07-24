/* eslint-disable camelcase */
'use strict'
const { load } = require('../util.mjs')
const main = require('./main')

module.exports = main(load('async'), __filename)
// module.exports.immdiateExit = true
