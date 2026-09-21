'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncprogressqueueworkerstream',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      let count = 0
      bindings.doProgress(5, value => {
        try {
          assert.deepStrictEqual(value, { index: count, data: count * 2 })
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
