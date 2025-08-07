/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')
const child_process = require('child_process')

if (process.argv[2] === 'child') {
  load('cleanup_hook')
} else {
  module.exports = new Promise((resolve) => {
    const { stdout, status, signal } =
      child_process.spawnSync(process.execPath, [
        '--expose-gc',
        ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
        // ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
        __filename,
        'child'
      ])
    assert.strictEqual(status, 0, `process exited with status(${status}) and signal(${signal})`)
    assert.strictEqual(stdout.toString().trim(), 'cleanup(42)')
    resolve()
  })
}
