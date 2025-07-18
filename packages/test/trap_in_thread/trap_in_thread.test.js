/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

async function main () {
  if (process.argv[2] === 'child') {
    const binding = await load('trap_in_thread')
    binding[process.argv[3]](() => {})
    return
  }

  const test = (f, signal) => {
    const { spawnSync } = require('child_process')
    const child = spawnSync(process.execPath, [
      '--expose-gc',
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
      ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
      __filename,
      'child', f
    ])
    assert.strictEqual(child.signal, process.env.EMNAPI_TEST_NATIVE ? signal : null)
  }

  test('abort', 'SIGABRT')
  test('releaseInThread', null)
  test('abortInThread','SIGABRT')
}

module.exports = main()
