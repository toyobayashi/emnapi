'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncworkererror',
  test: async function (bindings) {
    assert.strictEqual(typeof bindings.a, 'function')
    await new Promise((resolve, reject) => {
      bindings.a(err => {
        try {
          assert.ok(err)
          assert.strictEqual(err.message, 'Error')
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  }
}
