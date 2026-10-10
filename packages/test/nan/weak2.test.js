'use strict'
const assert = require('assert')

const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

module.exports = browser
  ? { skip: true }
  : {
      target: 'nan_weak2',
      test: function (bindings) {
        return new Promise((resolve, reject) => {
          let count = 0
          let pollTimer
          let deadlineTimer
          let settled = false
          const finish = err => {
            if (settled) return
            settled = true
            clearTimeout(pollTimer)
            clearTimeout(deadlineTimer)
            if (err) reject(err)
            else resolve()
          }
          assert.strictEqual(typeof bindings.hustle, 'function')
          bindings.hustle(value => {
            try {
              assert.strictEqual(value, 42)
              count++
            } catch (err) {
              finish(err)
            }
          })
          function check () {
            global.gc?.()
            global.gc?.()
            if (count > 0) {
              try {
                assert.strictEqual(count, 1)
                finish()
              } catch (err) {
                finish(err)
              }
            } else if (!settled) {
              pollTimer = setTimeout(check, 10)
            }
          }
          deadlineTimer = setTimeout(() => finish(new Error('Weak callback timed out')), 10000)
          check()
        })
      }
    }
