'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_errnoexception',
  test: function (binding) {
    const error = binding.create()
    assert.strictEqual(error.name, 'Error')
    assert.match(error.message, /ENOENT: .*open .*\/tmp\/missing/)
    assert.strictEqual(error.errno, -2)
    assert.strictEqual(error.code, 'ENOENT')
    assert.strictEqual(error.syscall, 'open')
    assert.strictEqual(error.path, '/tmp/missing')
  }
}
