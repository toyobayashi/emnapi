'use strict'

const { load } = require('../util.mjs')
const assert = require('assert')
const { spawnSync } = require('child_process')

async function main () {
  if (process.argv[2] === 'child') {
    // Keep the binding and its exported external alive until process teardown.
    const binding = await load('tsfn_shutdown_reentrant_release', {
      nodeBinding: require('@emnapi/node-binding')
    })
    void binding
    await new Promise(resolve => setTimeout(resolve, 100))
    return
  }

  const child = spawnSync(process.execPath, [
    ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
    __filename,
    'child'
  ], { encoding: 'utf8' })
  assert.ifError(child.error)
  assert.strictEqual(child.signal, null, child.stderr)
  assert.strictEqual(child.status, 0, child.stderr)
}

module.exports = main()
