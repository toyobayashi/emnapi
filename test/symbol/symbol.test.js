'use strict'
const assert = require('assert')
const { load } = require('../util')

// eslint-disable-next-line camelcase
module.exports = load('symbol').then(test_symbol => {
  const sym = test_symbol.New('test')
  assert.strictEqual(sym.toString(), 'Symbol(test)')

  const myObj = {}
  const fooSym = test_symbol.New('foo')
  const otherSym = test_symbol.New('bar')
  myObj.foo = 'bar'
  myObj[fooSym] = 'baz'
  myObj[otherSym] = 'bing'
  assert.strictEqual(myObj.foo, 'bar')
  assert.strictEqual(myObj[fooSym], 'baz')
  assert.strictEqual(myObj[otherSym], 'bing');

  (() => {
    const fooSym = test_symbol.New('foo')
    const myObj = {}
    myObj.foo = 'bar'
    myObj[fooSym] = 'baz'
    Object.keys(myObj) // -> [ 'foo' ]
    Object.getOwnPropertyNames(myObj) // -> [ 'foo' ]
    Object.getOwnPropertySymbols(myObj) // -> [ Symbol(foo) ]
    assert.strictEqual(Object.getOwnPropertySymbols(myObj)[0], fooSym)
  })()

  assert.notStrictEqual(test_symbol.New(), test_symbol.New())
  assert.notStrictEqual(test_symbol.New('foo'), test_symbol.New('foo'))
  assert.notStrictEqual(test_symbol.New('foo'), test_symbol.New('bar'))

  const foo1 = test_symbol.New('foo')
  const foo2 = test_symbol.New('foo')
  const object = {
    [foo1]: 1,
    [foo2]: 2
  }
  assert.strictEqual(object[foo1], 1)
  assert.strictEqual(object[foo2], 2)
})
