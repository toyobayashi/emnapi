'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_threadlocal',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      let planned = 0
      let observed = 0
      let firstError
      const tap = {
        plan (count) { planned = count },
        ok (value, message) {
          observed++
          if (!value && !firstError) firstError = new Error(message || 'TLS assertion failed')
        },
        end () {
          if (firstError) return reject(firstError)
          try {
            assert.strictEqual(observed, planned)
            resolve()
          } catch (err) {
            reject(err)
          }
        }
      }
      bindings.thread_local_storage(tap)
    })
  }
}
