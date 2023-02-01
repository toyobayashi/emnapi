/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
// const common = require('../common')
const assert = require('assert')
// const { fork } = require('child_process')

async function main () {
  if (process.argv[2] === 'child') {
    const loadPromise = load('exception')
    try {
      await loadPromise
    } catch (anException) {
      anException.binding.createExternal()
    }

    let gcCount = 10
    ;(function gcLoop () {
      global.gc()
      if (--gcCount > 0) {
        setImmediate(() => gcLoop())
      }
    })()
    return
  }

  const { spawnSync } = require('child_process')
  const child = spawnSync(process.execPath, [
    '--expose-gc',
    ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
    ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
    __filename,
    'child'
  ])
  assert.strictEqual(child.signal, null)
  assert.match(child.stderr.toString(), /Error during Finalize/)
}

module.exports = main()
