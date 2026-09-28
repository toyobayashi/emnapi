'use strict'

const { load } = require('../util.mjs')
const common = require('../common')
const assert = require('assert')
const { Worker, isMainThread } = require('worker_threads')

if (isMainThread) {
  const worker = new Worker(__filename)
  worker.on('error', common.mustNotCall())
  worker.on('exit', common.mustCall((code) => {
    assert.strictEqual(code, 0)
  }))
} else {
  module.exports = load('tsfn_shutdown_reentrant_release', {
    nodeBinding: require('@emnapi/node-binding')
  })
}
