'use strict'
const assert = require('assert')

module.exports = {
  target: 'nan_ext_stringbytes',
  test: function (binding) {
    const cases = [
      ['ascii', 'hello', 'hello', 0, 1],
      ['utf8', 'héllo', 'héllo', 1, 1],
      ['base64', 'aGVsbG8=', 'hello', 2, 1],
      ['ucs2', 'hello', 'hello', 3, 3],
      ['binary', '\u00ff\u0000A', '\u00ff\u0000A', 4, 4],
      ['hex', '68656c6c6f', 'hello', 5, 1]
    ]
    for (const [name, input, expected, inputEncoding, outputEncoding] of cases) {
      const result = binding.roundTrip(input, inputEncoding, outputEncoding)
      assert.strictEqual(result.value, expected, name)
      assert.strictEqual(result.written, result.length, name)
    }
    assert.strictEqual(binding.truncate('hello', 1), 'hel')
  }
}
