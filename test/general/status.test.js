/* eslint-disable symbol-description */
/* eslint-disable no-new-object */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

load('general').then(addon => {
  addon.createNapiError()
  const r = addon.testNapiErrorCleanup()
  console.log(r)
  assert(r, 'napi_status cleaned up for second call')
}).catch(err => {
  console.error(err)
  process.exit(1)
})
