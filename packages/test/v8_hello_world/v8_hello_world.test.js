'use strict'
const assert = require('assert')
const { load, getEntry } = require('../util')

module.exports = load('v8_hello_world').then(async binding => {
  assert.strictEqual(binding.hello(), 'world');

  // Test multiple loading of the same module.
  delete require.cache[getEntry('v8_hello_world')];
  const rebinding = await load('v8_hello_world');
  assert.strictEqual(rebinding.hello(), 'world');
  assert.notStrictEqual(binding.hello, rebinding.hello);
})
