/* eslint-disable camelcase */
'use strict'
// Flags: --expose-gc
const { load } = require('../util')
const common = require('../common')

module.exports = load('finalizer').then(async test_finalizer => {
  if (process.argv[2] === 'child') {
    (() => {
      const obj = {}
      test_finalizer.addFinalizerFailOnJS(obj)
    })()

    // Collect garbage 10 times. At least one of those should throw the exception
    // and cause the whole process to bail with it, its text printed to stderr and
    // asserted by the parent process to match expectations.
    let gcCount = 10;
    (function gcLoop () {
      global.gc()
      if (--gcCount > 0) {
        setImmediate(() => gcLoop())
      }
    })()
    return
  }

  const assert = require('assert')
  const { spawnSync } = require('child_process')
  const child = spawnSync(process.execPath, [
    '--expose-gc',
    ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
    // ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
    __filename,
    'child'
  ])
  assert.strictEqual(child.signal, (common.isWindows || !process.env.EMNAPI_TEST_NATIVE) ? null : 'SIGABRT')
  console.log(child.stderr.toString())
  assert.match(child.stderr.toString(), /Finalizer is calling a function that may affect GC state/)
})
