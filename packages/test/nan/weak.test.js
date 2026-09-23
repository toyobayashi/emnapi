'use strict'
const assert = require('assert')

const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'
const nodeVersion = browser ? 24 : Number(process.versions.node.split('.')[0])

module.exports = browser || nodeVersion >= 24
  ? { skip: true }
  : {
      target: 'nan_weak',
      test: function (bindings) {
        return new Promise((resolve, reject) => {
          let count = 0
          assert.strictEqual(typeof bindings.hustle, 'function')
          bindings.hustle(() => {}, value => {
            try {
              assert.strictEqual(value, 42)
              count++
            } catch (err) {
              reject(err)
            }
          })
          const timeout = setTimeout(function check () {
            global.gc?.()
            global.gc?.()
            if (count > 0) {
              clearTimeout(timeout)
              try {
                assert.strictEqual(count, 1)
                resolve()
              } catch (err) {
                reject(err)
              }
            } else {
              setTimeout(check, 10)
            }
          }, 100)
        })
      }
    }
