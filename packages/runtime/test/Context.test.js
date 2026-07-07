'use strict'

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { afterEach, test } = require('node:test')
const { createContext } = require('../dist/emnapi.cjs.js')

const addedBeforeExitListeners = new Set()
const runtimePath = path.join(__dirname, '../dist/emnapi.cjs.js')

function runRuntimeChild (source) {
  return spawnSync(process.execPath, [
    '--eval',
    `
      const { createContext } = require(${JSON.stringify(runtimePath)})
      ${source}
    `
  ], {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 5000
  })
}

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

test('autoDestroy does not depend on MessageChannel support', () => {
  const { context, listeners } = createContextAndGetBeforeExitListeners({
    autoDestroy: true,
    features: {
      MessageChannel: undefined
    }
  })

  assert.equal(listeners.length, 1)
  assert.ok(context.refCounter)

  context.destroy()
  addedBeforeExitListeners.delete(listeners[0])
})

test('request counter uses paired custom timer cancellation', () => {
  const scheduled = new Set()
  const cleared = []
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setTimeout (callback, delay) {
        const timer = { callback, delay }
        scheduled.add(timer)
        return timer
      },
      clearTimeout (timer) {
        cleared.push(timer)
        scheduled.delete(timer)
      }
    }
  })

  context.increaseWaitingRequestCounter()
  assert.equal(scheduled.size, 1)
  context.decreaseWaitingRequestCounter()

  assert.equal(cleared.length, 1)
  assert.equal(scheduled.size, 0)
  context.destroy()
})

test('request counter binds custom timer receivers to resolved features', () => {
  let scheduled
  let cleared
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setTimeout (callback, delay) {
        assert.equal(this, context.feature)
        scheduled = { callback, delay }
        return scheduled
      },
      clearTimeout (timer) {
        assert.equal(this, context.feature)
        cleared = timer
      }
    }
  })

  context.increaseWaitingRequestCounter()
  context.decreaseWaitingRequestCounter()

  assert.equal(cleared, scheduled)
  context.destroy()
})

test('request counter skips a setTimeout-only opaque timer backend', () => {
  const result = runRuntimeChild(`
    let schedules = 0
    function customSetTimeout (callback, delay) {
      schedules++
      globalThis.setTimeout(callback, delay)
      return 1
    }
    const context = createContext({
      autoDestroy: false,
      features: {
        MessageChannel: undefined,
        setTimeout: customSetTimeout
      }
    })
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    console.log(
      \`\${schedules}:\${context.feature.setTimeout === customSetTimeout}\`
    )
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '0:true')
})

test('request counter ignores a clearTimeout-only override', () => {
  const result = runRuntimeChild(`
    let cancellations = 0
    function customClearTimeout () {
      cancellations++
    }
    const context = createContext({
      autoDestroy: false,
      features: {
        MessageChannel: undefined,
        clearTimeout: customClearTimeout
      }
    })
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    console.log(
      \`\${cancellations}:\${context.feature.clearTimeout === customClearTimeout}\`
    )
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '0:false')
})

test('request counter falls back when custom timer throws', () => {
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setTimeout () {
        throw new Error('timer failed')
      },
      clearTimeout () {
        throw new Error('unexpected custom timer cancellation')
      }
    }
  })

  assert.doesNotThrow(() => context.increaseWaitingRequestCounter())
  assert.doesNotThrow(() => context.decreaseWaitingRequestCounter())
  context.destroy()
})

test('request counter releases a timer cancelled during scheduling', () => {
  const result = runRuntimeChild(`
    let context
    let schedules = 0
    let cancellations = 0
    context = createContext({
      autoDestroy: false,
      features: {
        MessageChannel: undefined,
        setTimeout (callback, delay) {
          schedules++
          context.decreaseWaitingRequestCounter()
          return globalThis.setTimeout(callback, delay)
        },
        clearTimeout (timer) {
          cancellations++
          globalThis.clearTimeout(timer)
        }
      }
    })
    context.increaseWaitingRequestCounter()
    console.log(\`\${schedules}:\${cancellations}\`)
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '1:1')
})

test('request counter releases synchronously fired timers when clear throws', () => {
  const result = runRuntimeChild(`
    const context = createContext({
      autoDestroy: false,
      features: {
        MessageChannel: undefined,
        setTimeout (callback, delay) {
          const timer = globalThis.setTimeout(() => {}, delay)
          callback()
          return timer
        },
        clearTimeout () {
          throw new Error('clear failed')
        }
      }
    })
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    console.log('released')
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'released')
})

test('request counter survives throwing host handle accessors', () => {
  let scheduled
  let cleared
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: class {
        constructor () {
          this.port1 = Object.defineProperties({}, {
            ref: {
              get () {
                return () => {
                  throw new Error('ref unavailable')
                }
              }
            },
            unref: {
              get () {
                throw new Error('unref unavailable')
              }
            }
          })
        }
      },
      setTimeout (callback, delay) {
        scheduled = { callback, delay }
        return scheduled
      },
      clearTimeout (timer) {
        cleared = timer
      }
    }
  })

  assert.doesNotThrow(() => context.increaseWaitingRequestCounter())
  assert.ok(scheduled)
  assert.doesNotThrow(() => context.decreaseWaitingRequestCounter())
  assert.equal(cleared, scheduled)
  context.destroy()
})

test('request counter reconciles a reentrant MessagePort ref getter', () => {
  const result = runRuntimeChild(`
    const { MessageChannel: NativeMessageChannel } =
      require('node:worker_threads')
    let context
    let channel
    class ReentrantRefMessageChannel {
      constructor () {
        channel = new NativeMessageChannel()
        const ref = channel.port1.ref
        Object.defineProperty(channel.port1, 'ref', {
          configurable: true,
          get () {
            context.decreaseWaitingRequestCounter()
            return ref
          }
        })
        this.port1 = channel.port1
        this.port2 = channel.port2
      }
    }
    context = createContext({
      autoDestroy: false,
      features: { MessageChannel: ReentrantRefMessageChannel }
    })
    context.increaseWaitingRequestCounter()
    console.log(
      \`\${context.refCounter.count}:\${channel.port1.hasRef()}\`
    )
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '0:false')
})

test('request counter reconciles a reentrant MessagePort unref getter', () => {
  const result = runRuntimeChild(`
    const { MessageChannel: NativeMessageChannel } =
      require('node:worker_threads')
    let context
    let channel
    let reentered = false
    class ReentrantUnrefMessageChannel {
      constructor () {
        channel = new NativeMessageChannel()
        const unref = channel.port1.unref
        Object.defineProperty(channel.port1, 'unref', {
          configurable: true,
          get () {
            if (!reentered) {
              reentered = true
              context.increaseWaitingRequestCounter()
            }
            return unref
          }
        })
        this.port1 = channel.port1
        this.port2 = channel.port2
      }
    }
    context = createContext({
      autoDestroy: false,
      features: { MessageChannel: ReentrantUnrefMessageChannel }
    })
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    const state =
      \`\${context.refCounter.count}:\${channel.port1.hasRef()}\`
    context.decreaseWaitingRequestCounter()
    console.log(state)
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '1:true')
})

test('request counter retires a MessagePort when unref fails', () => {
  const result = runRuntimeChild(`
    const { MessageChannel: NativeMessageChannel } =
      require('node:worker_threads')
    let timerSchedules = 0
    class ThrowingUnrefMessageChannel {
      constructor () {
        const channel = new NativeMessageChannel()
        channel.port1.unref = () => {
          throw new Error('unref failed')
        }
        this.port1 = channel.port1
        this.port2 = channel.port2
      }
    }
    const context = createContext({
      autoDestroy: false,
      features: {
        MessageChannel: ThrowingUnrefMessageChannel,
        setTimeout (callback, delay) {
          timerSchedules++
          return globalThis.setTimeout(callback, delay)
        },
        clearTimeout (timer) {
          globalThis.clearTimeout(timer)
        }
      }
    })
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    context.increaseWaitingRequestCounter()
    context.decreaseWaitingRequestCounter()
    console.log(timerSchedules)
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), '1')
})

test('pending requests keep Node alive without MessageChannel', () => {
  const result = runRuntimeChild(`
    const context = createContext({
      features: { MessageChannel: undefined }
    })
    const timer = setTimeout(() => {
      console.log(context.canCallIntoJs())
      context.decreaseWaitingRequestCounter()
    }, 10)
    timer.unref()
    context.increaseWaitingRequestCounter()
  `)

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), 'true')
})

test('Features keeps clearTimeout source-compatible', () => {
  const declarations = readFileSync(
    path.join(__dirname, '../dist/emnapi.d.ts'),
    'utf8'
  )
  assert.match(
    declarations,
    /clearTimeout\?: \(timeout: unknown\) => void;/
  )
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
