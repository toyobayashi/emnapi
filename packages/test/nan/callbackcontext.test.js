'use strict'
const assert = require('assert')

const browser = typeof globalThis.__EMNAPI_BROWSER_ENV__ !== 'undefined'

module.exports = browser
  ? { skip: true }
  : {
      target: 'nan_callbackcontext',
      test: async function (bindings) {
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
              if (type === 'nan:test.DelayRequest') resourceAsyncId = asyncId
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
          bindings.delay(1000, () => {
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
