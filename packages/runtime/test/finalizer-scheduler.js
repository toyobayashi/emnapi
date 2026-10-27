import assert from 'node:assert/strict'
import { createContext } from '@emnapi/runtime'

// workerd forbids host timers inside GC callbacks.
const forbidden = () => { throw new Error('Disallowed operation called within global scope') }

function createEnvironment (setImmediateImpl) {
  const context = createContext({
    features: { MessageChannel: undefined, setImmediate: setImmediateImpl }
  })
  const finalized = []
  const env = context.createEnv('finalizer-scheduler', 8, {
    address: 1,
    deleteEnv () {},
    setLastError () {},
    makeDynCall_vppp () { return (_env, data) => { finalized.push(data) } },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  return { context, env, finalized, finalizer: data => context.createTrackedFinalizer(env, 1, data, 0) }
}

function withQueueMicrotask (impl, fn) {
  const original = globalThis.queueMicrotask
  globalThis.queueMicrotask = impl
  try {
    fn()
  } finally {
    globalThis.queueMicrotask = original
  }
}

// A working setImmediate is used, matching Node-API.
{
  const { context, env, finalized, finalizer } = createEnvironment(setImmediate)
  env.invokeFinalizerFromGC(finalizer(1))
  await Promise.resolve()
  assert.deepStrictEqual(finalized, [], 'finalizers must wait for setImmediate')
  await new Promise(setImmediate)
  assert.deepStrictEqual(finalized, [1])
  context.destroy()
}

// A throwing setImmediate falls back to queueMicrotask.
{
  const { context, env, finalized, finalizer } = createEnvironment(forbidden)
  env.invokeFinalizerFromGC(finalizer(1))
  assert.deepStrictEqual(finalized, [])
  await Promise.resolve()
  assert.deepStrictEqual(finalized, [1])
  context.destroy()
}

// Without queueMicrotask the fallback uses a resolved promise.
{
  const { context, env, finalized, finalizer } = createEnvironment(forbidden)
  withQueueMicrotask(undefined, () => { env.invokeFinalizerFromGC(finalizer(1)) })
  await Promise.resolve()
  assert.deepStrictEqual(finalized, [1])
  context.destroy()
}

// If every scheduler fails, the error surfaces and a later retry still works.
{
  const { context, env, finalized, finalizer } = createEnvironment(forbidden)
  const pending = finalizer(1)
  const failure = new Error('queueMicrotask failed')
  withQueueMicrotask(() => { throw failure }, () => {
    assert.throws(() => env.invokeFinalizerFromGC(pending), error => error === failure)
  })
  assert.strictEqual(env.refs, 1, 'a failed schedule must not pin the environment')
  env.invokeFinalizerFromGC(pending)
  await Promise.resolve()
  assert.deepStrictEqual(finalized, [1])
  context.destroy()
}

console.log('ok - finalizer scheduling uses setImmediate with microtask fallback')
