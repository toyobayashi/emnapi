'use strict'
const assert = require('assert')
const { load } = require('../util')

// eslint-disable-next-line camelcase
load('value').then(mod => {
  assert.strictEqual(mod.i32(), 996)
  assert.strictEqual(mod.utf8(), 'utf8')
  assert.deepStrictEqual(mod.array(), [])
  assert.ok(mod.arrayWithLength().length === 6)
  assert.strictEqual(mod.symbol().toString(), 'Symbol(symbol)')
  assert.strictEqual(mod.undef(), undefined)
  assert.strictEqual(mod.nil(), null)
  assert.strictEqual(mod.bool(true), true)
  assert.strictEqual(mod.bool(false), false)
  assert.strictEqual(mod.global(), global)
  assert.strictEqual(mod.double(), 9.96)
  assert.strictEqual(mod.getDouble(Math.PI), Math.PI + 1)
  assert.strictEqual(mod.getVersion(), 7)
  assert.strictEqual(mod.uint32(), 4294967295)
  assert.strictEqual(mod.getUint32(4294967295), 0)
  assert.strictEqual(mod.getInt32(996), 997)
}).catch(err => {
  console.error(err)
  process.exit(1)
})
