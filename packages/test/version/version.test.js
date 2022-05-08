/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

module.exports = load('version').then(test_general => {
  const [major, minor, patch, release] = test_general.testGetNodeVersion()
  // assert.strictEqual(process.version.split('-')[0],
  //                  `v${major}.${minor}.${patch}`)
  // assert.strictEqual(release, process.release.name)
  assert.strictEqual(process.env.EMNAPI_TEST_NATIVE ? process.version : 'v16.15.0',
                   `v${major}.${minor}.${patch}`)
  assert.strictEqual(release, 'node')
})
