/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const main = require('./main')

module.exports = main(load('async_st'), __filename)
