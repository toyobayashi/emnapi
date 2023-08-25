'use strict'
const { load } = require('../util')

module.exports = load('cbinfo').then(addon => {
  addon.test1(addon.test2)
})
