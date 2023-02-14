/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const assert = require('assert')
const async_hooks = require('async_hooks')

module.exports = load('async', { nodeBinding: require('@emnapi/node-binding') }).then(test_async => {
  return new Promise((resolve, reject) => {
    const events = []
    let testId
    const initAsyncId = async_hooks.executionAsyncId()

    async_hooks.createHook({
      init (id, provider, triggerAsyncId, resource) {
        if (provider === 'TestResource') {
          testId = id
          events.push({ type: 'init', id, provider, triggerAsyncId, resource })
        }
      },
      before (id) {
        if (testId === id) {
          events.push({ type: 'before', id })
        }
      },
      after (id) {
        if (testId === id) {
          events.push({ type: 'after', id })
        }
      },
      destroy (id) {
        if (testId === id) {
          events.push({ type: 'destroy', id })
        }
      }
    }).enable()

    const resource = { foo: 'foo' }

    events.push({ type: 'start' })
    test_async.Test(5, resource, common.mustCall(function (err, val) {
      try {
        assert.strictEqual(err, null)
        assert.strictEqual(val, 10)
        events.push({ type: 'complete' })
        process.nextTick(common.mustCall())
      } catch (err) {
        reject(err)
      }
    }))
    events.push({ type: 'scheduled' })

    process.on('exit', () => {
      try {
        assert.deepStrictEqual(events, [
          { type: 'start' },
          {
            type: 'init',
            id: testId,
            provider: 'TestResource',
            triggerAsyncId: initAsyncId,
            resource
          },
          { type: 'scheduled' },
          { type: 'before', id: testId },
          { type: 'complete' },
          { type: 'after', id: testId },
          { type: 'destroy', id: testId }
        ])
      } catch (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
})
