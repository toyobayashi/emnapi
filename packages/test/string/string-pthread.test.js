const { load } = require('../util.mjs')
const test = require('./test.js')

module.exports = load('string_mt').then(test)
