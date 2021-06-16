'use strict'
const common = require('../common')
const { getEntry, load } = require('../util')
const assert = require('assert')
const { Worker } = require('worker_threads')

const bindingPath = getEntry('hello')
module.exports = load('hello').then((binding) => {
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

  return typeof mod.default === 'function' ? mod.default().then(({ Module }) => Module.emnapiExports) : Promise.resolve(mod)
}
load(${JSON.stringify(getEntry('hello'))}).then((binding) => { const msg = binding.hello(); parentPort.postMessage(msg) });`, { eval: true, env: process.env })
      .on('message', common.mustCall((msg) => assert.strictEqual(msg, 'world')))
  })
})
