/* eslint-disable symbol-description */
/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const common = require('../common')
const { onGC, gcUntil } = require('../gc')

const p = load('objwrapbasicfinalizer')
module.exports = p.then(async addon => {
  let obj = new addon.MyObject(9)
  let called = false
  onGC(obj, {
    ongc: common.mustCall(() => {
      called = true
    })
  })
  obj = null
  await gcUntil(() => called)
})
