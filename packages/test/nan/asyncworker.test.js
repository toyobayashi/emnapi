'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_asyncworker',
  test: async function (bindings) {
    const worker = bindings.a
    assert.strictEqual(typeof worker, 'function')
    let ticks = 0
    let called = false
    await new Promise((resolve, reject) => {
      function tick () {
        ticks++
        if (!called) setTimeout(tick, 0)
      }
      setTimeout(tick, 0)
      worker(200, function () {
        called = true
        try {
          assert.ok(ticks > 6, `got plenty of ticks! (${ticks})`)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })

    if (typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined') return
    const version = process.versions.node.split('.')
    if (Number(version[0]) < 9) return
    let asyncHooks
    try {
      asyncHooks = require('async_hooks')
    } catch (_) {
      return
    }
    await new Promise((resolve, reject) => {
      let resourceAsyncId
      const originalExecutionAsyncId = asyncHooks.executionAsyncId()
      let beforeCalled = false
      let afterCalled = false
      let destroyCalled = false
      const hooks = asyncHooks.createHook({
        init (asyncId, type) {
          if (type === 'nan:test.SleepWorker') resourceAsyncId = asyncId
        },
        before (asyncId) {
          if (asyncId === resourceAsyncId) beforeCalled = true
        },
        after (asyncId) {
          if (asyncId === resourceAsyncId) afterCalled = true
        },
        destroy (asyncId) {
          if (asyncId === resourceAsyncId) destroyCalled = true
        }
      })
      hooks.enable()
      worker(200, () => {
        try {
          assert.strictEqual(asyncHooks.executionAsyncId(), resourceAsyncId)
          assert.strictEqual(asyncHooks.triggerAsyncId(), originalExecutionAsyncId)
          assert.strictEqual(beforeCalled, true)
          assert.strictEqual(afterCalled, false)
        } catch (err) {
          hooks.disable()
          reject(err)
          return
        }
        setTimeout(() => {
          try {
            assert.strictEqual(afterCalled, true)
            assert.strictEqual(destroyCalled, true)
            assert.strictEqual(asyncHooks.triggerAsyncId(), resourceAsyncId)
            resolve()
          } catch (err) {
            reject(err)
          } finally {
            hooks.disable()
          }
        }, 1)
      })
    })
  }
}
