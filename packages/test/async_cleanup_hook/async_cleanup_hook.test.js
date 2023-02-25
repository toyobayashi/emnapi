'use strict'
const common = require('../common')
const { Worker } = require('worker_threads')
const { load } = require('../util')

module.exports = new Promise((resolve, reject) => {
  const w = new Worker(`
    const { load } = require(${JSON.stringify(require.resolve('../util.js'))})
    load('async_cleanup_hook')
  `, {
    eval: true,
    env: process.env,
    execArgv: [
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : [])
    ]
  })
  w.on('exit', common.mustCall((code) => {
    console.log('Worker exit')
    if (code !== 0) {
      reject(new Error(`Worker exit: ${code}`))
      return
    }
    load('async_cleanup_hook')
      .then(resolve)
      .catch(reject)
  }))
})
