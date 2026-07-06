'use strict'

const assert = require('node:assert/strict')
const { afterEach, test } = require('node:test')
const { createContext } = require('../dist/emnapi.cjs.js')

const addedBeforeExitListeners = new Set()

afterEach(() => {
  for (const listener of addedBeforeExitListeners) {
    process.removeListener('beforeExit', listener)
  }
  addedBeforeExitListeners.clear()
})

function createContextAndGetBeforeExitListeners (options, passOptions = true) {
  const existingListeners = new Set(process.rawListeners('beforeExit'))
  const context = passOptions ? createContext(options) : createContext()
  const listeners = process.rawListeners('beforeExit')
    .filter(listener => !existingListeners.has(listener))

  for (const listener of listeners) {
    addedBeforeExitListeners.add(listener)
  }

  return { context, listeners }
}

test('autoDestroy defaults to true', () => {
  const { context, listeners } = createContextAndGetBeforeExitListeners(
    undefined,
    false
  )

  assert.equal(listeners.length, 1)

  let destroyCalls = 0
  context.destroy = () => {
    destroyCalls++
  }
  listeners[0]()

  assert.equal(destroyCalls, 1)
})

test('autoDestroy true installs a beforeExit listener', () => {
  const { context, listeners } = createContextAndGetBeforeExitListeners({
    autoDestroy: true
  })

  assert.equal(listeners.length, 1)
  assert.equal(process.rawListeners('beforeExit').includes(listeners[0]), true)

  context.destroy()

  assert.equal(process.rawListeners('beforeExit').includes(listeners[0]), false)
  addedBeforeExitListeners.delete(listeners[0])
})

test('suppressDestroy removes the beforeExit listener', () => {
  const { context, listeners } = createContextAndGetBeforeExitListeners()

  assert.equal(listeners.length, 1)
  context.suppressDestroy()
  assert.equal(process.rawListeners('beforeExit').includes(listeners[0]), false)
  addedBeforeExitListeners.delete(listeners[0])
})

test('cleanup hooks removed during cleanup are not invoked', () => {
  const context = createContext({ autoDestroy: false })
  const env = {}
  const calls = []
  const removed = () => {
    calls.push('removed')
  }
  const added = () => {
    calls.push('added')
  }
  const remover = () => {
    calls.push('remover')
    context.removeCleanupHook(env, removed, 1)
    context.addCleanupHook(env, added, 3)
  }

  context.addCleanupHook(env, removed, 1)
  context.addCleanupHook(env, remover, 2)
  context.runCleanup()

  assert.deepEqual(calls, ['remover', 'added'])
})

test('autoDestroy false keeps the request counter without a listener', () => {
  const { context, listeners } = createContextAndGetBeforeExitListeners({
    autoDestroy: false
  })

  assert.equal(listeners.length, 0)
  assert.ok(context.refCounter)
  assert.equal(context.canCallIntoJs(), true)

  context.destroy()

  assert.equal(context.canCallIntoJs(), false)
})
