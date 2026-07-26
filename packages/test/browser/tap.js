'use strict'

const assert = require('assert')

function test (name, callback) {
  let planned
  let actual = 0
  const count = (fn) => (...args) => {
    actual++
    return fn(...args)
  }
  const t = {
    plan (value) {
      planned = value
    },
    type: count((value, expected) => assert.strictEqual(typeof value, expected)),
    equal: count((actual, expected) => assert.strictEqual(actual, expected)),
    equals: count((actual, expected) => assert.strictEqual(actual, expected)),
    ok: count(value => assert.ok(value)),
    end () {
      if (planned !== undefined) assert.strictEqual(actual, planned, `${name}: assertion count`)
    }
  }
  callback(t)
  if (planned !== undefined) assert.strictEqual(actual, planned, `${name}: assertion count`)
}

exports.test = test
