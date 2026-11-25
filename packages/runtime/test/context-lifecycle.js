import assert from 'node:assert/strict'
import vm from 'node:vm'
import { createContext, Finalizer, getDylinkMetadata, NAPI_VERSION_EXPERIMENTAL } from '@emnapi/runtime'

// 1. createContext({ autoDestroy: false }) attaches no beforeExit listener.
{
  const before = process.listenerCount('beforeExit')
  const context = createContext({ autoDestroy: false })
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  context.suppressDestroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  context.destroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 2. Default createContext() attaches 1 beforeExit listener, removed by suppressDestroy().
{
  const before = process.listenerCount('beforeExit')
  const context = createContext()
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  context.suppressDestroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  // Repeated calls are safe no-ops.
  context.suppressDestroy()
  context.destroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 3. Default createContext() attaches 1 beforeExit listener, removed by destroy().
{
  const before = process.listenerCount('beforeExit')
  const context = createContext({ autoDestroy: true })
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  context.destroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  // Repeated calls are safe no-ops.
  context.destroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 4. autoDestroy works independently of MessageChannel availability.
{
  const before = process.listenerCount('beforeExit')
  const contextNoAuto = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined }
  })
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  contextNoAuto.destroy()

  const contextAuto = createContext({
    features: { MessageChannel: undefined }
  })
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  contextAuto.destroy()
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 5. suppressDestroy() and destroy() tolerate hosts without process.removeListener.
{
  const before = process.listenerCount('beforeExit')
  const context = createContext()
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  const [addedListener] = process.listeners('beforeExit').slice(-1)
  const originalRemoveListener = process.removeListener
  try {
    process.removeListener = undefined
    context.suppressDestroy()
    context.destroy()
  } finally {
    process.removeListener = originalRemoveListener
    process.removeListener('beforeExit', addedListener)
  }
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 6. A throwing cleanup hook during manual destroy() keeps the beforeExit
// listener registered so automatic teardown can still retry remaining hooks.
{
  const before = process.listenerCount('beforeExit')
  const context = createContext()
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  const env = context.createEnv('cleanup-retry', 8, {
    address: 1,
    deleteEnv () {},
    setLastError () {},
    makeDynCall_vppp () { return () => {} },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  const calls = []
  let shouldThrow = true
  context.addCleanupHook(env, () => { calls.push('second') }, 1)
  context.addCleanupHook(env, () => {
    calls.push('first')
    if (shouldThrow) {
      shouldThrow = false
      throw new Error('transient cleanup error')
    }
  }, 2)

  assert.throws(() => context.destroy(), /transient cleanup error/)
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1, 'beforeExit listener must remain after failed destroy()')

  context.destroy()
  assert.deepStrictEqual(calls, ['first', 'first', 'second'])
  assert.strictEqual(process.listenerCount('beforeExit'), before)
}

// 7. getDylinkMetadata recognizes a cross-realm WebAssembly.Module.
{
  // Minimal wasm module with a `dylink.0` custom section:
  //   mem_info: memorySize=16, memoryAlign=2, tableSize=4, tableAlign=0
  //   needed: ["libfoo.so"]
  const dylinkName = Buffer.from('dylink.0')
  const memInfoPayload = [16, 2, 4, 0]
  const neededStr = Buffer.from('libfoo.so')
  const neededPayload = [1, neededStr.length, ...neededStr]
  const customPayload = [
    dylinkName.length, ...dylinkName,
    0x01, memInfoPayload.length, ...memInfoPayload,
    0x02, neededPayload.length, ...neededPayload
  ]
  const wasmBytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x00, customPayload.length, ...customPayload
  ])

  const crossRealmModule = vm.runInNewContext('new WebAssembly.Module(bytes)', { bytes: wasmBytes })
  assert.strictEqual(crossRealmModule instanceof WebAssembly.Module, false)

  const meta = getDylinkMetadata(crossRealmModule)
  assert.strictEqual(meta.memorySize, 16)
  assert.strictEqual(meta.memoryAlign, 2)
  assert.strictEqual(meta.tableSize, 4)
  assert.strictEqual(meta.tableAlign, 0)
  assert.deepStrictEqual(meta.neededDynlibs, ['libfoo.so'])

  const context = createContext({ autoDestroy: false })
  const ctxMeta = context.getDylinkMetadata(crossRealmModule)
  assert.strictEqual(ctxMeta.memorySize, 16)
  assert.deepStrictEqual(ctxMeta.neededDynlibs, ['libfoo.so'])
  context.destroy()
}

// 8. Context.abort() latches the context, removes beforeExit, aborts refCounter,
// drops cleanup hooks and pending tasks, and prevents any Wasm re-entry.
{
  let refCalls = 0
  let unrefCalls = 0
  let closeCalls = 0
  class FakeMessageChannel {
    constructor () {
      this.port1 = {
        ref () { refCalls++ },
        unref () { unrefCalls++ },
        close () {
          closeCalls++
          throw new Error('close failed')
        }
      }
      this.port2 = {}
    }
  }
  const queuedImmediates = []
  const before = process.listenerCount('beforeExit')
  const context = createContext({
    features: {
      MessageChannel: FakeMessageChannel,
      setImmediate: (fn) => { queuedImmediates.push(fn) }
    }
  })
  assert.strictEqual(process.listenerCount('beforeExit'), before + 1)
  assert.strictEqual(context.isAborted(), false)
  assert.strictEqual(context.canCallIntoJs(), true)
  assert.strictEqual(context.hasPendingWork(), false)

  let deleteEnvCalls = 0
  let dynCallVpCalls = 0
  let dynCallVpppCalls = 0
  const env = context.createEnv('abort-test', 8, {
    address: 1,
    deleteEnv () { deleteEnvCalls++ },
    setLastError () {},
    makeDynCall_vppp () { return () => { dynCallVpppCalls++ } },
    makeDynCall_vp () { return () => { dynCallVpCalls++ } },
    abort (message) { throw new Error(message) }
  })

  let cleanupHookCalls = 0
  context.addCleanupHook(env, () => { cleanupHookCalls++ }, 1)
  context.addCleanupHook(env, 7, 2)
  context.increaseWaitingRequestCounter()
  assert.strictEqual(refCalls, 1)

  let immediateTaskCalls = 0
  let microtaskCalls = 0
  let registeredTaskCalls = 0
  context.scheduleImmediate(() => { immediateTaskCalls++ })
  context.scheduleMicrotask(() => { microtaskCalls++ })
  context.registerPendingTask(() => { registeredTaskCalls++ })
  assert.strictEqual(context.hasPendingWork(), true)

  context.abort()
  assert.strictEqual(context.isAborted(), true)
  assert.strictEqual(context.canCallIntoJs(), false)
  assert.strictEqual(context.hasPendingWork(), false)
  assert.strictEqual(process.listenerCount('beforeExit'), before)
  assert.strictEqual(unrefCalls, 1)
  assert.strictEqual(closeCalls, 1)
  assert.strictEqual(cleanupHookCalls, 0)
  assert.strictEqual(deleteEnvCalls, 0)
  assert.strictEqual(dynCallVpCalls, 0)

  // Latched: cannot be re-enabled, repeated abort is idempotent, and cleanup /
  // destroy / waiting request / flush / drain / scheduling are all no-ops.
  context.setCanCallIntoJs(true)
  context.setStopping(false)
  assert.strictEqual(context.canCallIntoJs(), false)
  context.abort()
  assert.strictEqual(closeCalls, 1)
  context.addCleanupHook(env, () => { cleanupHookCalls++ }, 3)
  context.runCleanup()
  context.destroy()
  context.increaseWaitingRequestCounter()
  context.decreaseWaitingRequestCounter()
  assert.strictEqual(refCalls, 1)
  assert.strictEqual(unrefCalls, 1)
  context.scheduleImmediate(() => { immediateTaskCalls++ })
  context.scheduleMicrotask(() => { microtaskCalls++ })
  context.registerPendingTask(() => { registeredTaskCalls++ })
  assert.strictEqual(context.hasPendingWork(), false)
  context.flush()
  await context.drain()

  // Firing any already-queued immediates and microtasks after abort must do nothing.
  for (const fn of queuedImmediates) fn()
  await Promise.resolve()
  assert.strictEqual(immediateTaskCalls, 0)
  assert.strictEqual(microtaskCalls, 0)
  assert.strictEqual(registeredTaskCalls, 0)
  assert.strictEqual(cleanupHookCalls, 0)
  assert.strictEqual(deleteEnvCalls, 0)
  assert.strictEqual(dynCallVpCalls, 0)
  assert.strictEqual(dynCallVpppCalls, 0)
}

// 9. Env / NodeEnv / Finalizer post-abort gates and enqueueFinalizer flush/drain.
{
  // Normal flush() runs NodeEnv.enqueueFinalizer once and stalled setImmediate
  // does not double-unref or double-run.
  const queuedImmediates = []
  const finalized = []
  let deleteEnvCalls = 0
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setImmediate: (fn) => { queuedImmediates.push(fn) }
    }
  })
  const env = context.createEnv('finalizer-flush', 8, {
    address: 1,
    deleteEnv () { deleteEnvCalls++ },
    setLastError () {},
    makeDynCall_vppp () { return (_e, data) => { finalized.push(data) } },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  env.invokeFinalizerFromGC(context.createTrackedFinalizer(env, 1, 101, 0))
  assert.strictEqual(env.refs, 2)
  assert.strictEqual(context.hasPendingWork(), true)
  context.flush()
  assert.deepStrictEqual(finalized, [101])
  assert.strictEqual(env.refs, 1)
  assert.strictEqual(deleteEnvCalls, 0)
  assert.strictEqual(context.hasPendingWork(), false)
  assert.strictEqual(queuedImmediates.length, 1)
  // Stalled setImmediate fires later: must be a no-op (no double unref!)
  queuedImmediates[0]()
  assert.strictEqual(env.refs, 1)
  assert.strictEqual(deleteEnvCalls, 0)
  context.destroy()
  assert.strictEqual(deleteEnvCalls, 1)
}

{
  // Abort before scheduled finalizer drain runs: drain must return BEFORE unref()
  // so deleteEnv() and finalizer callbacks never enter Wasm.
  const queuedImmediates = []
  let finalizerCalls = 0
  let deleteEnvCalls = 0
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setImmediate: (fn) => { queuedImmediates.push(fn) }
    }
  })
  const env = context.createEnv('finalizer-abort', 8, {
    address: 1,
    deleteEnv () { deleteEnvCalls++ },
    setLastError () {},
    makeDynCall_vppp () { return () => { finalizerCalls++ } },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  const f1 = context.createTrackedFinalizer(env, 1, 1, 0)
  env.invokeFinalizerFromGC(f1)
  assert.strictEqual(env.refs, 2)
  // Simulate initial env ref already dropped so an unguarded unref() in drain
  // would hit refs === 0 and call bridge.deleteEnv().
  env.refs = 1
  context.abort()
  for (const fn of queuedImmediates) fn()
  assert.strictEqual(deleteEnvCalls, 0)
  assert.strictEqual(finalizerCalls, 0)

  // Post-abort invokeFinalizerFromGC (standard + experimental), enqueueFinalizer,
  // drainFinalizerQueue, and Finalizer.callFinalizer (with env, after resetEnv,
  // copy, and move) must all be no-ops.
  const f2 = context.createTrackedFinalizer(env, 1, 2, 0)
  env.invokeFinalizerFromGC(f2)
  env.moduleApiVersion = NAPI_VERSION_EXPERIMENTAL
  env.invokeFinalizerFromGC(f2)
  env.enqueueFinalizer(f2)
  env.drainFinalizerQueue()

  const rawFin = new Finalizer(env, 1, 3, 0)
  const copiedFin = rawFin.copy()
  const movedFin = new Finalizer(env, 0, 0, 0)
  copiedFin.move(movedFin)
  rawFin.resetEnv()
  rawFin.callFinalizer()
  movedFin.callFinalizer()
  assert.strictEqual(finalizerCalls, 0)
  assert.strictEqual(deleteEnvCalls, 0)
}

{
  // Mid-loop abort inside drainFinalizerQueue stops remaining finalizers.
  const ran = []
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined, setImmediate: () => {} }
  })
  const env = context.createEnv('drain-mid-abort', 8, {
    address: 1,
    deleteEnv () {},
    setLastError () {},
    makeDynCall_vppp () {
      return (_e, data) => {
        ran.push(data)
        if (data === 1) context.abort()
      }
    },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  env.enqueueFinalizer(context.createTrackedFinalizer(env, 1, 1, 0))
  env.enqueueFinalizer(context.createTrackedFinalizer(env, 1, 2, 0))
  env.drainFinalizerQueue()
  assert.deepStrictEqual(ran, [1])
}

// 10. Context.flush() / drain() with stalled setImmediate, Promise chaining,
// throwing setImmediate rollback, and mid-flush / mid-drain abort.
{
  const queued = []
  const events = []
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setImmediate: (fn) => { queued.push(fn) }
    }
  })
  context.scheduleImmediate(() => {
    events.push('imm1')
    Promise.resolve().then(() => {
      events.push('promise-then')
      context.scheduleImmediate(() => {
        events.push('imm2')
      })
    })
  })
  context.scheduleMicrotask(() => {
    events.push('micro1')
  })
  assert.strictEqual(context.hasPendingWork(), true)
  await context.drain()
  assert.deepStrictEqual(events, ['imm1', 'micro1', 'promise-then', 'imm2'])
  assert.strictEqual(context.hasPendingWork(), false)

  // Firing stalled immediates later must not double-run.
  for (const fn of queued) fn()
  await Promise.resolve()
  assert.deepStrictEqual(events, ['imm1', 'micro1', 'promise-then', 'imm2'])
  context.destroy()
}

{
  // scheduleImmediate rolls back pending task registration if setImmediate throws.
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setImmediate: () => { throw new Error('setImmediate denied') }
    }
  })
  assert.throws(() => context.scheduleImmediate(() => {}), /setImmediate denied/)
  assert.strictEqual(context.hasPendingWork(), false)
  context.destroy()
}

{
  // Mid-flush abort stops remaining tasks immediately.
  const ran = []
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined, setImmediate: () => {} }
  })
  context.scheduleImmediate(() => {
    ran.push('first')
    context.abort()
  })
  context.scheduleImmediate(() => {
    ran.push('second')
  })
  context.flush()
  assert.deepStrictEqual(ran, ['first'])
  assert.strictEqual(context.hasPendingWork(), false)
}

{
  // Mid-drain abort (inside a Promise.then between flush turns) stops drain cleanly.
  const ran = []
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined, setImmediate: () => {} }
  })
  context.scheduleImmediate(() => {
    ran.push('first')
    Promise.resolve().then(() => {
      context.scheduleImmediate(() => { ran.push('never') })
      context.abort()
    })
  })
  await context.drain()
  assert.deepStrictEqual(ran, ['first'])
}

{
  // Nested context.flush() inside an active task (whether invoked via flush()
  // or directly via setImmediate) must not re-entrantly run subsequent tasks
  // before the active task finishes.
  const queued = []
  const order = []
  const context = createContext({
    autoDestroy: false,
    features: {
      MessageChannel: undefined,
      setImmediate: (fn) => { queued.push(fn) }
    }
  })
  context.scheduleImmediate(() => {
    order.push('a-start')
    context.flush()
    order.push('a-end')
  })
  context.scheduleImmediate(() => {
    order.push('b')
  })
  context.flush()
  assert.deepStrictEqual(order, ['a-start', 'a-end', 'b'])

  // Same guarantee when triggered directly by setImmediate rather than outer flush()
  order.length = 0
  queued.length = 0
  context.scheduleImmediate(() => {
    order.push('c-start')
    context.flush()
    order.push('c-end')
  })
  context.scheduleImmediate(() => {
    order.push('d')
  })
  queued[0]()
  assert.deepStrictEqual(order, ['c-start', 'c-end'])
  assert.strictEqual(context.hasPendingWork(), true)
  context.flush()
  assert.deepStrictEqual(order, ['c-start', 'c-end', 'd'])
  context.destroy()
}

// 11. Abort mid-teardown (inside a cleanup hook or inside an env teardown finalizer)
// must stop subsequent native cleanup hooks and bridge.deleteEnv().
{
  let nativeHookCalls = 0
  let deleteEnvCalls = 0
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined }
  })
  const env = context.createEnv('teardown-hook-abort', 8, {
    address: 1,
    deleteEnv () { deleteEnvCalls++ },
    setLastError () {},
    makeDynCall_vppp () { return () => {} },
    makeDynCall_vp () { return () => { nativeHookCalls++ } },
    abort (message) { throw new Error(message) }
  })
  // CleanupQueue drains LIFO: hook 2 runs first and aborts before hook 1 (native)
  // and the env.unref() cleanup hook can run.
  context.addCleanupHook(env, 1, 10)
  context.addCleanupHook(env, () => { context.abort() }, 20)
  context.destroy()
  assert.strictEqual(nativeHookCalls, 0)
  assert.strictEqual(deleteEnvCalls, 0)
}

{
  const ranFinalizers = []
  let deleteEnvCalls = 0
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined }
  })
  const env = context.createEnv('teardown-finalizer-abort', 8, {
    address: 1,
    deleteEnv () { deleteEnvCalls++ },
    setLastError () {},
    makeDynCall_vppp () {
      return (_env, data) => {
        ranFinalizers.push(data)
        if (data === 1) context.abort()
      }
    },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  // finalizing_reflist links at head (LIFO): link 2 then 1 so 1 runs first and aborts.
  context.createTrackedFinalizer(env, 1, 2, 0)
  context.createTrackedFinalizer(env, 1, 1, 0)
  context.destroy()
  assert.deepStrictEqual(ranFinalizers, [1])
  assert.strictEqual(deleteEnvCalls, 0)
}

// 12. Queued JS functions created via Context.createFunction must refuse Wasm
// re-entry (and not call setLastError or the native callback) after abort().
{
  let setLastErrorCalls = 0
  let nativeCbCalls = 0
  const context = createContext({
    autoDestroy: false,
    features: { MessageChannel: undefined }
  })
  const env = context.createEnv('queued-fn-abort', 8, {
    address: 1,
    deleteEnv () {},
    setLastError () { setLastErrorCalls++ },
    makeDynCall_vppp () { return () => {} },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  })
  const fn = context.createFunction(env, () => {
    nativeCbCalls++
    return 0
  }, 0, 'queuedExport', false)

  const pendingCall = Promise.resolve().then(() => fn())
  context.abort()
  await assert.rejects(pendingCall, /Context has been aborted/)
  assert.strictEqual(setLastErrorCalls, 0)
  assert.strictEqual(nativeCbCalls, 0)
}

console.log('ok - context autoDestroy/beforeExit lifecycle, abort/flush/drain, and cross-realm getDylinkMetadata')
