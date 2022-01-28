'use strict'
const common = require('../common')
const { getEntry, load } = require('../util')
const assert = require('assert')
const { Worker } = require('worker_threads')
const { join } = require('path')

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
  
  function load (request) {
    const mod = require(request)
  
    return typeof mod.default === 'function' ? mod.default({ emnapiRuntime: require(${JSON.stringify(join(__dirname, '../../dist/emnapi.min.js'))}) }).then(({ Module }) => Module.emnapiExports) : Promise.resolve(mod)
  }
  load(${JSON.stringify(getEntry('hello'))}).then((binding) => { const msg = binding.hello(); parentPort.postMessage(msg) });`, { eval: true, env: process.env })
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
