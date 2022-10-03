'use strict'
const { load } = require('../util')

const p = load('ref_double_free')
module.exports = p.then(addon => {
  addon.deleteImmediately({})
})
