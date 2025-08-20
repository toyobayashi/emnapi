'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_json_parse')
module.exports = p.then(bindings => {
  assert.strictEqual(typeof bindings.parse, 'function');
  assert.deepStrictEqual(
    bindings.parse('{ "a": "JSON", "string": "value" }'),
    JSON.parse('{ "a": "JSON", "string": "value" }')
  );
  assert.deepStrictEqual(
    bindings.parse('[ 1, 2, 3 ]'),
    JSON.parse('[ 1, 2, 3 ]')
  );
  assert.strictEqual(
    bindings.parse('57'),
    JSON.parse('57')
  );
  assert.strictEqual(
    bindings.parse('3.14159'),
    JSON.parse('3.14159')
  );
  assert.strictEqual(
    bindings.parse('true'),
    JSON.parse('true')
  );
  assert.strictEqual(
    bindings.parse('false'),
    JSON.parse('false')
  );
  assert.strictEqual(
    bindings.parse('"some string"'),
    JSON.parse('"some string"')
  );
})
