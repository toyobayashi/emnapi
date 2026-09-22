'use strict'
const assert = require('assert')
const util = require('util')
const Readable = require('stream').Readable

module.exports = {
  target: 'nan_asyncprogressworkerstream',
  test: function (bindings) {
    function StreamProgressWorker () {
      Readable.call(this, { objectMode: true })
      const self = this
      process.nextTick(() => {
        bindings.a(100, 5, value => self.push(value), () => self.push(null))
      })
    }
    util.inherits(StreamProgressWorker, Readable)
    StreamProgressWorker.prototype._read = function () {}

    return new Promise((resolve, reject) => {
      const stream = new StreamProgressWorker()
      let progressed = 0
      stream.on('error', reject)
        .on('end', () => {
          try {
            assert.strictEqual(progressed, 5)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
        .on('data', () => { progressed++ })
    })
  }
}
