'use strict'
const common = require('../common')
const { Worker } = require('worker_threads')
const { load, getEntry } = require('../util')

module.exports = new Promise((resolve, reject) => {
  const w = new Worker(`
    const emnapi = require(${JSON.stringify(require.resolve('../../runtime'))})
    const context = emnapi.createContext()

    function load (request) {
      const mod = require(request)

      return typeof mod.default === 'function' ? mod.default().then(({ Module }) => Module.emnapiInit({ context })) : Promise.resolve(mod)
    }

    load(${JSON.stringify(getEntry('async_cleanup_hook'))})
  `, { eval: true, env: process.env })
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
