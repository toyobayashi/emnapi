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

  const test = async (f, signal) => {
    const { spawn } = require('child_process')
    const child = spawn(process.execPath, [
      '--expose-gc',
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
      // ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
      __filename,
      'child', f
    ], { stdio: 'inherit' })
    const result = await new Promise((resolve, reject) => {
      let exit = false
      child.on('exit', (code, signal) => {
        console.log(`Child exited with code: ${code}, signal: ${signal}`)
        exit = true
        resolve({
          code,
          signal
        })
      })
      setTimeout(() => {
        if (exit) return
        reject(new Error(`Test timed out: ${f}`))
        child.kill('SIGKILL')
      }, 2000)
    })
    assert.strictEqual(result.signal, process.env.EMNAPI_TEST_NATIVE ? signal : null)
  }

  await test('abort', 'SIGABRT')
  await test('releaseInThread', null)
  await test('abortInThread', 'SIGABRT')
  await test('join', 'SIGABRT')
}

module.exports = main()
