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
  const { listeners } = createContextAndGetBeforeExitListeners({
    autoDestroy: true
  })

  assert.equal(listeners.length, 1)
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
