import assert from 'node:assert/strict'
import vm from 'node:vm'
import { createContext, getDylinkMetadata } from '@emnapi/runtime'

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

console.log('ok - context autoDestroy/beforeExit lifecycle and cross-realm getDylinkMetadata')
