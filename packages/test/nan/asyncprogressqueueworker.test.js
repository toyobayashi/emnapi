'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncprogressqueueworker',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      let count = 0
      bindings.doProgress(5, i => {
        try {
          assert.strictEqual(i, count++)
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
