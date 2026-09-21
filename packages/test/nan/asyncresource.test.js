'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncresource',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      bindings.delay(10, () => {
        try {
          assert.ok(true)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  }
}
