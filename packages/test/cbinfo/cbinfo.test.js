'use strict'
const { load } = require('../util.mjs')

module.exports = load('cbinfo').then(addon => {
  addon.test1(addon.test2)
})
