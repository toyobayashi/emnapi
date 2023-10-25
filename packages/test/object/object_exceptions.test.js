/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')

module.exports = load('object_exception').then(test_object => {
  const { testExceptions } = test_object

  function throws () {
    throw new Error('foobar')
  }
  testExceptions(new Proxy({}, {
    get: common.mustCallAtLeast(throws, 1),
    getOwnPropertyDescriptor: common.mustCallAtLeast(throws, 1),
    defineProperty: common.mustCallAtLeast(throws, 1),
    deleteProperty: common.mustCallAtLeast(throws, 1),
    has: common.mustCallAtLeast(throws, 1),
    set: common.mustCallAtLeast(throws, 1),
    ownKeys: common.mustCallAtLeast(throws, 1)
  }))
})
