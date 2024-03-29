'use strict'

const assert = require('assert')

if (process.argv[2] === 'fatal') {
  require('../util.js').loadPath(process.argv[3]).then(binding => {
    binding.error.throwFatalError()
  })
} else {
  module.exports = require('./common').runTestWithBindingPath(test)
}

async function test (bindingPath) {
  const binding = await require('../util.js').loadPath(bindingPath)

  assert.throws(() => binding.error.throwApiError('test'), function (err) {
    return err instanceof Error && err.message.includes('Invalid')
  })

  assert.throws(() => binding.error.lastExceptionErrorCode(), function (err) {
    return err instanceof TypeError && err.message === 'A boolean was expected'
  })

  assert.throws(() => binding.error.throwJSError('test'), function (err) {
    return err instanceof Error && err.message === 'test'
  })

  assert.throws(() => binding.error.throwTypeError('test'), function (err) {
    return err instanceof TypeError && err.message === 'test'
  })

  assert.throws(() => binding.error.throwRangeError('test'), function (err) {
    return err instanceof RangeError && err.message === 'test'
  })

  assert.throws(
    () => binding.error.doNotCatch(
      () => {
        throw new TypeError('test')
      }),
    function (err) {
      return err instanceof TypeError && err.message === 'test' && !err.caught
    })

  assert.throws(
    () => binding.error.catchAndRethrowError(
      () => {
        throw new TypeError('test')
      }),
    function (err) {
      return err instanceof TypeError && err.message === 'test' && err.caught
    })

  const err = binding.error.catchError(
    () => { throw new TypeError('test') })
  assert(err instanceof TypeError)
  assert.strictEqual(err.message, 'test')

  const msg = binding.error.catchErrorMessage(
    () => { throw new TypeError('test') })
  assert.strictEqual(msg, 'test')

  assert.throws(() => binding.error.throwErrorThatEscapesScope('test'), function (err) {
    return err instanceof Error && err.message === 'test'
  })

  assert.throws(() => binding.error.catchAndRethrowErrorThatEscapesScope('test'), function (err) {
    return err instanceof Error && err.message === 'test' && err.caught
  })

  const p = require('./napi_child').spawnSync(
    process.execPath, [
      '--expose-gc',
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
      ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
      __filename,
      'fatal',
      bindingPath
    ]
  )
  assert.ifError(p.error)
  assert.ok(p.stderr.toString().includes(
    'FATAL ERROR: Error::ThrowFatalError This is a fatal error'))

  assert.throws(() => binding.error.throwDefaultError(false),
    /Cannot convert undefined or null to object/)

  assert.throws(() => binding.error.throwDefaultError(true),
    /A number was expected/)
}
