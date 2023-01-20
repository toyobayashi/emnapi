'use strict'
const common = require('../common')
const { getEntry, load } = require('../util')
const assert = require('assert')
const { Worker } = require('worker_threads')

const bindingPath = getEntry('hello')
module.exports = new Promise((resolve, reject) => {
  load('hello').then((binding) => {
    assert.strictEqual(binding.hello(), 'world')
    console.log('binding.hello() =', binding.hello())
    delete require.cache[bindingPath]
    load('hello').then((rebinding) => {
      assert.strictEqual(rebinding.hello(), 'world')
      assert.notStrictEqual(binding.hello, rebinding.hello)

      new Worker(`
  const { parentPort } = require('worker_threads');
  const { load } = require(${JSON.stringify(require.resolve('../util.js'))})
  load('hello').then((binding) => { const msg = binding.hello(); parentPort.postMessage(msg) });`, { eval: true, env: process.env })
        .on('message', common.mustCall((msg) => {
          try {
            assert.strictEqual(msg, 'world')
          } catch (err) {
            reject(err)
            throw err
          }
          resolve()
        }))
    }).catch(reject)
  }).catch(reject)
})
