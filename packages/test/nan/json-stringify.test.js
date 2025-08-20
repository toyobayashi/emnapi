'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_json_stringify')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.stringify, 'function');
  assert.strictEqual(
    bindings.stringify({ "a": "JSON", "object": "value" }),
    JSON.stringify({ "a": "JSON", "object": "value" })
  );
  assert.strictEqual(
    bindings.stringify({ "a": "JSON", "object": "value" }, null, 2),
    JSON.stringify({ "a": "JSON", "object": "value" }, null, 2)
  );
  assert.strictEqual(
    bindings.stringify({ "a": "JSON", "object": "value" }, null, '++'),
    JSON.stringify({ "a": "JSON", "object": "value" }, null, '++')
  );
  assert.strictEqual(
    bindings.stringify([ 1, 2, 3 ]),
    JSON.stringify([ 1, 2, 3 ])
  );
  assert.strictEqual(
    bindings.stringify([ 1, 2, 3 ], null, 2),
    JSON.stringify([ 1, 2, 3 ], null, 2)
  );
  assert.strictEqual(
    bindings.stringify([ 1, 2, 3 ], null, '++'),
    JSON.stringify([ 1, 2, 3 ], null, '++')
  );
  assert.strictEqual(
    bindings.stringify("a string"),
    JSON.stringify("a string")
  );
  assert.strictEqual(
    bindings.stringify("a string", null, 2),
    JSON.stringify("a string", null, 2)
  );
  assert.strictEqual(
    bindings.stringify("a string", null, '++'),
    JSON.stringify("a string", null, '++')
  );
  assert.strictEqual(
    bindings.stringify(3.14159),
    JSON.stringify(3.14159)
  );
  assert.strictEqual(
    bindings.stringify(3.14159, null, 2),
    JSON.stringify(3.14159, null, 2)
  );
  assert.strictEqual(
    bindings.stringify(3.14159, null, '++'),
    JSON.stringify(3.14159, null, '++')
  );
  assert.strictEqual(
    bindings.stringify(-31),
    JSON.stringify(-31)
  );
  assert.strictEqual(
    bindings.stringify(-31, null, 2),
    JSON.stringify(-31, null, 2)
  );
  assert.strictEqual(
    bindings.stringify(-31, null, '++'),
    JSON.stringify(-31, null, '++')
  );
  assert.strictEqual(
    bindings.stringify(true),
    JSON.stringify(true)
  );
  assert.strictEqual(
    bindings.stringify(true, null, 2),
    JSON.stringify(true, null, 2)
  );
  assert.strictEqual(
    bindings.stringify(true, null, '++'),
    JSON.stringify(true, null, '++')
  );
  assert.strictEqual(
    bindings.stringify(false),
    JSON.stringify(false)
  );
  assert.strictEqual(
    bindings.stringify(false, null, 2),
    JSON.stringify(false, null, 2)
  );
  assert.strictEqual(
    bindings.stringify(false, null, '++'),
    JSON.stringify(false, null, '++')
  );
})
