const { load } = require('../util')
const test = require('./test.js')

module.exports = load('string_mt').then(test)
