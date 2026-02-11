'use strict'
const common = require('../common')
const { load } = require('../util')
const assert = require('assert')
const { fork } = require('child_process')

module.exports = new Promise((resolve, reject) => {
  load('tsfn_shutdown', { nodeBinding: require('@emnapi/node-binding') }).then((binding) => {
    if (process.argv[2] === 'child') {
      binding();
      setTimeout(() => {}, 100);
    } else {
      const child = fork(__filename, ['child']);
      child.on('close', common.mustCall((code) => {
        assert.strictEqual(code, 0);
      }));
    }
  }).catch(reject)
})
