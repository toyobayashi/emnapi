'use strict'
const assert = require('assert')
const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

module.exports = browser
  ? { skip: true }
  : {
      target: 'nan_bufferworkerpersistent',
      test: function (bindings) {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto')
      const worker = bindings.a
      let buf = crypto.randomBytes(256)
      const bufHex = buf.toString('hex')
      assert.strictEqual(typeof worker, 'function')
      worker(200, buf, value => {
        try {
          assert.strictEqual(Buffer.isBuffer(value), true)
          assert.strictEqual(value.toString('hex'), bufHex)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
      buf = null
    })
      }
    }
