'use strict'

const calls = []

function mustCall (fn = () => {}, exact = 1) {
  if (typeof fn === 'number') {
    exact = fn
    fn = () => {}
  }
  const record = { actual: 0, exact, fn }
  calls.push(record)
  return function (...args) {
    record.actual++
    return Reflect.apply(fn, this, args)
  }
}

function mustCallAtLeast (fn = () => {}, minimum = 1) {
  if (typeof fn === 'number') {
    minimum = fn
    fn = () => {}
  }
  const record = { actual: 0, minimum, fn }
  calls.push(record)
  return function (...args) {
    record.actual++
    return Reflect.apply(fn, this, args)
  }
}

function mustNotCall (message) {
  return function () {
    throw new Error(message || 'function should not have been called')
  }
}

async function gcUntil (name, condition) {
  if (typeof name === 'function') {
    condition = name
    name = undefined
  }
  for (let i = 0; i < 50; i++) {
    if (condition()) return
    globalThis.gc?.()
    // Allocating and yielding gives browser engines an opportunity to collect.
    Array.from({ length: 32 }, () => new ArrayBuffer(1024 * 1024))
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(name ? `Test ${name} failed` : 'Garbage collection condition was not met')
}

function verifyMustCalls () {
  const pending = calls.splice(0)
  for (const call of pending) {
    if ('exact' in call && call.actual !== call.exact) {
      throw new Error(`function was called ${call.actual} time(s), expected ${call.exact}`)
    }
    if ('minimum' in call && call.actual < call.minimum) {
      throw new Error(`function was called ${call.actual} time(s), expected at least ${call.minimum}`)
    }
  }
}

function resetMustCalls () {
  calls.length = 0
}

async function runTest (test) {
  const { load } = require('../util.mjs')
  for (const name of [
    'naa_binding',
    'naa_binding_noexcept',
    'naa_binding_noexcept_maybe',
    'naa_binding_custom_namespace'
  ]) {
    await test(await load(name))
  }
}

module.exports = {
  gcUntil,
  isWindows: false,
  mustCall,
  mustCallAtLeast,
  mustNotCall,
  platformTimeout: value => value,
  resetMustCalls,
  runTest,
  verifyMustCalls
}
