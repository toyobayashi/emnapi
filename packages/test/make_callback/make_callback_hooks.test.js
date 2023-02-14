/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')
const async_hooks = require('async_hooks')

module.exports = load('make_callback', { nodeBinding: require('@emnapi/node-binding') }).then(async binding => {
  const makeCallback = binding.makeCallback

  // Check async hooks integration using async context.
  const hook_result = {
    id: null,
    init_called: false,
    before_called: false,
    after_called: false,
    destroy_called: false
  }
  const test_hook = async_hooks.createHook({
    init: (id, type) => {
      if (type === 'test') {
        hook_result.id = id
        hook_result.init_called = true
      }
    },
    before: (id) => {
      if (id === hook_result.id) hook_result.before_called = true
    },
    after: (id) => {
      if (id === hook_result.id) hook_result.after_called = true
    },
    destroy: (id) => {
      if (id === hook_result.id) hook_result.destroy_called = true
    }
  })

  test_hook.enable()

  await new Promise((resolve, reject) => {
    /**
     * Resource should be able to be arbitrary objects without special internal
     * slots. Testing with plain object here.
     */
    const resource = {}
    makeCallback(resource, process, function cb () {
      try {
        assert.strictEqual(this, process)
        assert.strictEqual(async_hooks.executionAsyncResource(), resource)
      } catch (err) {
        reject(err)
        return
      }
      resolve()
    })
  })

  assert.strictEqual(hook_result.init_called, true)
  assert.strictEqual(hook_result.before_called, true)
  assert.strictEqual(hook_result.after_called, true)
  await new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        assert.strictEqual(hook_result.destroy_called, true)
      } catch (err) {
        reject(err)
        return
      } finally {
        test_hook.disable()
      }
      resolve()
    })
  })
})
