'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_persistent',
  skip: true, // TODO
  test: async function (bindings) {
    var persistent = bindings;
    assert.strictEqual(typeof persistent.save1, 'function');
    assert.strictEqual(typeof persistent.get1, 'function');
    assert.strictEqual(typeof persistent.dispose1, 'function');
    assert.strictEqual(typeof persistent.toPersistentAndBackAgain, 'function');
    assert.strictEqual(typeof persistent.persistentToPersistent, 'function');
    assert.strictEqual(typeof persistent.copyablePersistent, 'function');
    assert.strictEqual(typeof persistent.passGlobal, 'function');

    assert.deepStrictEqual(persistent.toPersistentAndBackAgain({ x: 42 }), { x: 42 });

    assert.strictEqual(persistent.persistentToPersistent('any string'), 'any string');

    persistent.save1('a string to save');
    assert.strictEqual(persistent.get1(), 'a string to save');
    assert.strictEqual(persistent.copyablePersistent(), 'a string to save');

    assert.strictEqual(persistent.passGlobal(), 42, 'pass global');

    await new Promise((resolve, reject) => {
      setTimeout(function () {
        try {
          assert.strictEqual(persistent.get1(), 'a string to save');
          persistent.dispose1();
          assert.ok(persistent.get1() === undefined, 'no more persistent');
          assert.ok(persistent.copyablePersistent() === undefined, 'no more persistent');
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 25);
    })
  }
}
