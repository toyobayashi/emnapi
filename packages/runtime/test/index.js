import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

// 1. require() resolves the CJS facade and exposes exactly the same named
//    exports as the ESM entry (exact set equality, both directions)
const cjs = require('@emnapi/runtime')
const esm = await import('@emnapi/runtime')
const esmKeys = Object.getOwnPropertyNames(esm).filter(k => k !== 'default').sort()
const cjsKeys = Object.getOwnPropertyNames(cjs).sort()
assert.deepStrictEqual(cjsKeys, esmKeys, 'require() export names must exactly match the ESM export names')
for (const key of esmKeys) {
  assert.strictEqual(cjs[key], esm[key], `require/import disagree on "${key}"`)
}

// 2. the exports object is mutable (generated WASI loaders and test harnesses
//    patch e.g. createContext on the shared require() cache entry)
const originalCreateContext = cjs.createContext
const replacement = () => {}
cjs.createContext = replacement
assert.strictEqual(cjs.createContext, replacement, 'exports must be mutable')
assert.strictEqual(require('@emnapi/runtime').createContext, replacement, 'mutation must be visible to other require() consumers')
cjs.createContext = originalCreateContext

// 3. import() of the CJS entry itself exposes exactly the same named exports
//    (cjs-module-lexer static detection of the per-name assignments)
const cjsEntry = pathToFileURL(require.resolve('@emnapi/runtime'))
assert.match(cjsEntry.pathname, /index\.cjs$/, 'require condition must resolve to index.cjs')
const nsOfCjs = await import(cjsEntry)
// 'default' and 'module.exports' are Node's own CJS-ESM interop keys added to
// import()ed CJS namespaces (not exports of the facade); drop them before the
// exact comparison
const nsOfCjsKeys = Object.getOwnPropertyNames(nsOfCjs).filter(k => k !== 'default' && k !== 'module.exports').sort()
assert.deepStrictEqual(nsOfCjsKeys, esmKeys, 'import() of index.cjs named exports must exactly match the ESM export names')

// 4. finalizer queue operations preserve FIFO order while allowing O(1)
// duplicate detection and removal.
const context = esm.createContext()
const bridge = {
  address: 1,
  deleteEnv () {},
  setLastError () {},
  makeDynCall_vppp () { return () => {} },
  makeDynCall_vp () { return () => {} },
  abort (message) { throw new Error(message) }
}
const env = new esm.NodeEnv(context, new esm.ArrayStore(), bridge)
assert.ok(env.pendingFinalizers instanceof Set, 'finalizer queue must use constant-time membership checks')

const order = []
const finalizers = Array.from({ length: 4 }, (_, index) => {
  const finalizer = new esm.RefTracker()
  finalizer.finalize = () => { order.push(index) }
  return finalizer
})
env.enqueueFinalizer(finalizers[0])
env.enqueueFinalizer(finalizers[1])
env.enqueueFinalizer(finalizers[1])
env.enqueueFinalizer(finalizers[2])
env.dequeueFinalizer(finalizers[1])
env.enqueueFinalizer(finalizers[1])
finalizers[0].finalize = () => {
  order.push(0)
  env.dequeueFinalizer(finalizers[2])
  env.enqueueFinalizer(finalizers[3])
}
env.drainFinalizerQueue()
assert.deepStrictEqual(order, [0, 1, 3], 'finalizer queue mutation must preserve FIFO semantics')
assert.strictEqual(env.pendingFinalizers.size, 0, 'drained finalizer queue must be empty')

// A throwing finalizer is consumed, but later finalizers remain queued so a
// subsequent drain can resume where the interrupted drain stopped.
const throwing = new esm.RefTracker()
const afterThrow = new esm.RefTracker()
throwing.finalize = () => { throw new Error('finalizer failure') }
afterThrow.finalize = () => { order.push(4) }
env.enqueueFinalizer(throwing)
env.enqueueFinalizer(afterThrow)
assert.throws(() => env.drainFinalizerQueue(), /finalizer failure/)
assert.strictEqual(env.pendingFinalizers.has(throwing), false)
assert.strictEqual(env.pendingFinalizers.has(afterThrow), true)
env.drainFinalizerQueue()
assert.deepStrictEqual(order, [0, 1, 3, 4])

console.log(`ok - CJS entry exposes ${esmKeys.length} mutable named exports`)
