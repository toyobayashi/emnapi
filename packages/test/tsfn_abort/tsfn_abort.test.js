'use strict'
const { load } = require('../util')

module.exports = new Promise((resolve, reject) => {
  load('tsfn_abort', { nodeBinding: require('@emnapi/node-binding') }).then((binding) => {
    binding()
  }).catch(reject)
})
