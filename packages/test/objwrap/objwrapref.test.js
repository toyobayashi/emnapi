/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')

const p = load('objwrap')
module.exports = p.then(addon => {
  (function scope () {
    addon.objectWrapDanglingReference({})
  })()

  return common.gcUntil('object-wrap-ref', () => {
    return addon.objectWrapDanglingReferenceTest()
  })
})
