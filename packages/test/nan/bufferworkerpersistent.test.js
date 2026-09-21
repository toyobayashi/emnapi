'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_bufferworkerpersistent',
  test: function (bindings) {
    return new Promise((resolve, reject) => {
      const input = Buffer.from('bufferworker')
      let count = 0
      bindings.a(1, input, value => {
        try {
          assert.strictEqual(Buffer.isBuffer(value), true)
          assert.strictEqual(value.toString(), input.toString())
          count++
        } catch (err) {
          reject(err)
        }
      })
      setTimeout(() => {
        try {
          assert.strictEqual(count, 3)
          resolve()
        } catch (err) {
          reject(err)
        }
      }, 30)
    })
  }
}
