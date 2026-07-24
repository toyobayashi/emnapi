'use strict'
const { load } = require('../util.mjs')

const p = load('ref_double_free')
module.exports = p.then(addon => {
  addon.deleteImmediately({})
})
