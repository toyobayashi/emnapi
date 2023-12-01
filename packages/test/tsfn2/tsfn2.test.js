/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const main = require('./main')

module.exports = main(load('tsfn2', { nodeBinding: require('@emnapi/node-binding') }))
