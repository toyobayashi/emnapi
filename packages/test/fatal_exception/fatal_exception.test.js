/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')
const common = require('../common')

module.exports = new Promise((resolve, reject) => {
  load('fatal_exception', { nodeBinding: require('@emnapi/node-binding') }).then((test_fatal) => {
    process.on('uncaughtException', common.mustCall(function (err) {
      console.error(err.message)
      try {
        assert.strictEqual(err.message, 'fatal error')
      } catch (err) {
        reject(err)
        return
      }
      resolve()
    }))
    const err = new Error('fatal error')
    try {
      test_fatal.Test(err)
    } catch (_) {
      reject(new Error('expect not catch'))
    }
  }).catch(reject)
})
