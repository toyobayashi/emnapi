'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncworker',
  test: async function (bindings) {
    assert.strictEqual(typeof bindings.a, 'function')
    let ticks = 0
    let called = false
    const timer = setInterval(() => { ticks++ }, 0)
    await new Promise((resolve, reject) => {
      bindings.a(50, () => {
        called = true
        clearInterval(timer)
        try {
          assert.ok(ticks > 2)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
    assert.ok(called)
  }
}
