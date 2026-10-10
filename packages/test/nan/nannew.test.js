'use strict'
const assert = require('assert')
const tap = require('tap')
const test = tap.test
const waitForTap = require('./tap-promise')

module.exports = {
  target: 'nan_nannew',
  test: async function (bindings) {
    const pending = []
    for (var symbol in bindings) {
      if (typeof bindings[symbol] == 'function' && symbol.match(/^test.*/)) {
        pending.push(waitForTap(test('C++: ' + symbol, bindings[symbol])))
      }
    }

    pending.push(waitForTap(test('numbers', function (t) {
      t.plan(12);

      t.type(bindings.newIntegerWithValue, 'function');
      t.equals(bindings.newIntegerWithValue(23), 23);
      t.equals(bindings.newIntegerWithValue(5), 5);
      t.type(bindings.newIntegerWithValue(23), 'number');

      t.type(bindings.newNumberWithValue, 'function');
      t.equals(bindings.newNumberWithValue(Math.PI), Math.PI);
      t.equals(bindings.newNumberWithValue(Math.E), Math.E);
      t.type(bindings.newNumberWithValue(Math.PI), 'number');

      t.type(bindings.newUint32WithValue, 'function');
      t.equals(bindings.newUint32WithValue(23), 23);
      t.equals(bindings.newUint32WithValue(5), 5);
      t.type(bindings.newUint32WithValue(5), 'number');
      t.end();
    })))


    pending.push(waitForTap(test('strings', function (t) {
      t.plan(3);

      t.equals(bindings.newStringFromChars(), "hello?");
      t.equals(bindings.newStringFromCharsWithLength(), "hell");
      t.equals(bindings.newStringFromStdString(), "hello!");

      t.end();
    })))

    pending.push(waitForTap(test('test MakeMaybe(...)', function (t) {
      t.plan(1);
      t.ok(bindings.invokeMakeMaybe() - Math.PI < 10e-8);
      t.end();
    })))

    await Promise.all(pending)
  }
}
