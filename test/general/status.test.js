/* eslint-disable symbol-description */
/* eslint-disable no-new-object */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('general').then(addon => {
  addon.createNapiError()
  assert(addon.testNapiErrorCleanup(), 'napi_status cleaned up for second call')
})
