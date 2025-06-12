'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_error')
module.exports = p.then(bindings => {
  const errors = ['Error', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError'];
  errors.forEach(function (val) {
    var i;
    for (i = 1; i <= 4; i++) {
      assert.strictEqual(typeof bindings['Throw' + val + i], 'function');
      try {
        bindings['Throw' + val + i]();
      } catch (err) {
        assert.strictEqual(err instanceof globalThis[val], true);
        assert.strictEqual(err.message, 'errmsg');
      }
    }
  });
})
