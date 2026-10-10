'use strict'
const assert = require('assert')
const tap = require('tap')
const test = tap.test
const waitForTap = require('./tap-promise')

module.exports = {
  target: 'nan_morenews',
  test: async function (bindings) {
    return waitForTap(test('morenews', function (t) {
      t.plan(16);
      t.type(bindings.newNumber, 'function');
      t.type(bindings.newPositiveInteger, 'function');
      t.type(bindings.newNegativeInteger, 'function');
      t.type(bindings.newUtf8String, 'function');
      t.type(bindings.newLatin1String, 'function');
      t.type(bindings.newUcs2String, 'function');
      t.type(bindings.newExternalStringResource, 'function');
      t.type(bindings.newExternalAsciiStringResource, 'function');

      t.equal(bindings.newNumber(), 0.5);
      t.equal(bindings.newPositiveInteger(), 1);
      t.equal(bindings.newNegativeInteger(), -1);
      t.equal(bindings.newUtf8String(), 'strïng');
      t.equal(bindings.newLatin1String(), 'strïng');
      t.equal(bindings.newUcs2String(), 'strïng');
      t.equals(bindings.newExternalStringResource(), 'strïng');
      t.equals(bindings.newExternalAsciiStringResource(), 'string');
    }))
  }
}
