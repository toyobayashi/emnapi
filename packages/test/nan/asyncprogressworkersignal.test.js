'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncprogressworkersignal',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      let count = 0
      bindings.a(1, 5, value => {
        try {
          assert.strictEqual(value, true)
          count++
        } catch (err) {
          reject(err)
        }
      }, () => {
        try {
          assert.strictEqual(count, 5)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  }
}
