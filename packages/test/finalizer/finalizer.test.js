/* eslint-disable camelcase */
/* eslint-disable no-lone-blocks */
'use strict'
// Flags: --expose-gc --force-node-api-uncaught-exceptions-policy

const common = require('../common')
const { load } = require('../util')
const assert = require('assert')

module.exports = new Promise((resolve) => {
  const p1 = new Promise((resolve, reject) => {
    process.on('uncaughtException', common.mustCall((err) => {
      try {
        assert.throws(() => { throw err }, /finalizer error/)
      } catch (err) {
        reject(err)
        return
      }
      resolve()
    }))
  })

  const p2 = new Promise((resolve, reject) => {
    load('finalizer').then((binding) => {
      {
        binding.createExternalWithJsFinalize(
          common.mustCall(() => {
            throw new Error('finalizer error')
          }))
      }
      setImmediate(() => {
        global.gc()
      })
    }, reject).then(common.mustCall(resolve))
  })

  resolve(Promise.all([p1, p2]))
})
