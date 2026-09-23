/* eslint-disable camelcase */
'use strict'
const { load } = require('../util.mjs')

const loadPromise = load('module_version_mismatch')

module.exports = loadPromise.then(async (_binding) => {
  throw new Error('This test should not be loaded, as the module version is mismatched. It should have been rejected with an error.')
}, (err) => {
  if (/requires Node-API version 2147483646, but this version of Node\.js only supports version \d+ add-ons\./.test(err.message)) {
    return Promise.resolve()
  }
  throw err
})
