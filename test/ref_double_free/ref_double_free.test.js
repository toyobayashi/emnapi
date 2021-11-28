/* eslint-disable no-new-object */
/* eslint-disable symbol-description */
/* eslint-disable camelcase */
/* eslint-disable no-lone-blocks */
/* eslint-disable no-new */
'use strict'
const { load } = require('../util')

const p = load('ref_double_free')
module.exports = p.then(addon => {
  { new addon.MyObject(true) }
  { new addon.MyObject(false) }
})
