'use strict'
const assert = require('assert');
const common = require('./common')

module.exports = common.runTest(test)

async function test (binding) {
  assert.strictEqual(binding.handlescope.createScope(), 'scope');
  console.log(binding.handlescope.returnValueInScope())
  assert.strictEqual(binding.handlescope.returnValueInScope(), 'inner-scope');
  assert.strictEqual(binding.handlescope.createScopeFromExisting(), 'existing_scope');
  assert.strictEqual(binding.handlescope.escapeFromScope(), 'inner-scope');
  assert.strictEqual(binding.handlescope.escapeFromExistingScope(), 'inner-existing-scope');
  assert.strictEqual(binding.handlescope.stressEscapeFromScope(), 'inner-scope999999');
  assert.throws(() => binding.handlescope.doubleEscapeFromScope(),
    Error,
    ' napi_escape_handle already called on scope');
}
