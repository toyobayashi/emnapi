import assert from 'node:assert/strict'
import asyncHooks from 'node:async_hooks'
import { EventEmitter } from 'node:events'
import vm from 'node:vm'
import { markAsUntransferable } from 'node:worker_threads'
import { createContext, getDefaultContext } from '@emnapi/runtime'
import * as emnapiCore from '@emnapi/core'
import { instantiateNapiModuleSync } from '@emnapi/core'

// The smallest module that Node-API init accepts:
// (module
//   (memory (export "memory") 1)
//   (table (export "__indirect_function_table") 1 funcref)
//   (func (export "malloc") (param i32) (result i32) (i32.const 1024))
//   (func (export "free") (param i32))
//   (func (export "emnapi_create_env") (result i32) (i32.const 64))
//   (func (export "emnapi_delete_env") (param i32))
//   (func (export "napi_register_wasm_v1") (param i32 i32) (result i32) (i32.const 0)))
const wasm = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x14, 0x04, 0x60,
  0x01, 0x7f, 0x01, 0x7f, 0x60, 0x01, 0x7f, 0x00, 0x60, 0x00, 0x01, 0x7f,
  0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, 0x03, 0x06, 0x05, 0x00, 0x01, 0x02,
  0x01, 0x03, 0x04, 0x04, 0x01, 0x70, 0x00, 0x01, 0x05, 0x03, 0x01, 0x00,
  0x01, 0x07, 0x76, 0x07, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02,
  0x00, 0x19, 0x5f, 0x5f, 0x69, 0x6e, 0x64, 0x69, 0x72, 0x65, 0x63, 0x74,
  0x5f, 0x66, 0x75, 0x6e, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x5f, 0x74, 0x61,
  0x62, 0x6c, 0x65, 0x01, 0x00, 0x06, 0x6d, 0x61, 0x6c, 0x6c, 0x6f, 0x63,
  0x00, 0x00, 0x04, 0x66, 0x72, 0x65, 0x65, 0x00, 0x01, 0x11, 0x65, 0x6d,
  0x6e, 0x61, 0x70, 0x69, 0x5f, 0x63, 0x72, 0x65, 0x61, 0x74, 0x65, 0x5f,
  0x65, 0x6e, 0x76, 0x00, 0x02, 0x11, 0x65, 0x6d, 0x6e, 0x61, 0x70, 0x69,
  0x5f, 0x64, 0x65, 0x6c, 0x65, 0x74, 0x65, 0x5f, 0x65, 0x6e, 0x76, 0x00,
  0x03, 0x15, 0x6e, 0x61, 0x70, 0x69, 0x5f, 0x72, 0x65, 0x67, 0x69, 0x73,
  0x74, 0x65, 0x72, 0x5f, 0x77, 0x61, 0x73, 0x6d, 0x5f, 0x76, 0x31, 0x00,
  0x04, 0x0a, 0x18, 0x05, 0x05, 0x00, 0x41, 0x80, 0x08, 0x0b, 0x02, 0x00,
  0x0b, 0x05, 0x00, 0x41, 0xc0, 0x00, 0x0b, 0x02, 0x00, 0x0b, 0x04, 0x00,
  0x41, 0x00, 0x0b
])

// The addon-neutral API is available while the old N-API names stay usable
// through the 2.0.0 beta releases.
for (const name of [
  'createAddonModule',
  'loadAddon',
  'loadAddonSync',
  'instantiateAddon',
  'instantiateAddonSync',
  'createNapiModule',
  'loadNapiModule',
  'loadNapiModuleSync',
  'instantiateNapiModule',
  'instantiateNapiModuleSync'
]) {
  assert.strictEqual(typeof emnapiCore[name], 'function', `${name} must be exported`)
}

{
  const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
  const source = emnapiCore.loadAddonSync(addonModule, wasm)
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.strictEqual(addonModule.loaded, true)
}

{
  const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
  const source = await emnapiCore.loadAddon(addonModule, wasm)
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.strictEqual(addonModule.loaded, true)
}

{
  const source = emnapiCore.instantiateAddonSync(wasm, { context: getDefaultContext() })
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.ok(source.addonModule)
  assert.strictEqual('napiModule' in source, false)
}

{
  const source = await emnapiCore.instantiateAddon(wasm, { context: getDefaultContext() })
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.ok(source.addonModule)
  assert.strictEqual('napiModule' in source, false)
}

{
  const napiModule = emnapiCore.createNapiModule({ context: getDefaultContext() })
  const source = emnapiCore.loadNapiModuleSync(napiModule, wasm)
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.strictEqual(napiModule.loaded, true)
}

{
  const napiModule = emnapiCore.createNapiModule({ context: getDefaultContext() })
  const source = await emnapiCore.loadNapiModule(napiModule, wasm)
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.strictEqual(napiModule.loaded, true)
}

{
  const source = await emnapiCore.instantiateNapiModule(wasm, { context: getDefaultContext() })
  assert.ok(source.instance instanceof WebAssembly.Instance)
  assert.ok(source.napiModule)
  assert.strictEqual('addonModule' in source, false)
}

{
  const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
  const handler = new emnapiCore.MessageHandler({ postMessage () {}, onLoad: () => ({ addonModule }) })
  handler.instantiate({})
  assert.strictEqual(handler.addonModule, addonModule)
  assert.strictEqual(handler.napiModule, addonModule)
}

{
  const napiModule = emnapiCore.createNapiModule({ context: getDefaultContext() })
  const handler = new emnapiCore.MessageHandler({ postMessage () {}, onLoad: () => ({ napiModule }) })
  handler.instantiate({})
  assert.strictEqual(handler.addonModule, napiModule)
  assert.strictEqual(handler.napiModule, napiModule)
}

class FakeWorker extends EventEmitter {
  constructor () {
    super()
    this.posts = []
    this.terminated = false
  }

  postMessage (message) {
    this.posts.push(message.__emnapi__?.type)
  }

  terminate () {
    this.terminated = true
    return Promise.resolve(0)
  }

  ref () {}
  unref () {}
}

// A synchronous instantiate with a worker pool returns at once and starts
// loading every pool worker in the background. It used to throw
// 'Synchronous loading is not supported with worker pool'.
const created = []
const { instance, napiModule } = instantiateNapiModuleSync(wasm, {
  context: getDefaultContext(),
  reuseWorker: { size: 3 },
  onCreateWorker () {
    const worker = new FakeWorker()
    created.push(worker)
    return worker
  }
})

assert.ok(instance instanceof WebAssembly.Instance)
assert.strictEqual(napiModule.loaded, true)
assert.strictEqual(created.length, 3)
for (const worker of created) {
  assert.deepStrictEqual(worker.posts, ['load'])
  assert.strictEqual(worker.terminated, false)
  assert.ok(worker.whenLoaded instanceof Promise)
}
assert.deepStrictEqual(napiModule.PThread.unusedWorkers, created)

// A spawn on a pool worker that is still loading reports success right away.
// If that load fails later, the thread is cleaned up and the error is
// reported; it must not become an unhandled rejection, which makes Node.js
// exit with code 1.
{
  const unhandled = []
  const onUnhandled = (reason) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const workers = []
    const errors = []
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
    let imports
    const { napiModule } = instantiateNapiModuleSync(wasm, {
      context: getDefaultContext(),
      reuseWorker: { size: 1 },
      wasi: { wasiImport: {}, getImportObject: () => ({}), initialize () {}, start () { return 0 } },
      getMemory: () => memory,
      printErr (text) { errors.push(text) },
      overwriteImports (importObject) {
        imports = importObject
        return importObject
      },
      onCreateWorker () {
        const worker = new FakeWorker()
        workers.push(worker)
        return worker
      }
    })
    const [worker] = workers
    assert.deepStrictEqual(worker.posts, ['load'])

    const result = imports.wasi['thread-spawn'](0, 64)
    assert.strictEqual(result, 0)
    assert.deepStrictEqual(worker.posts, ['load', 'start'])
    worker.emit('message', {
      __emnapi__: {
        type: 'thread-error',
        payload: { error: { name: 'Error', message: 'load failed after spawn' }, phase: 'load' }
      }
    })
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))

    assert.deepStrictEqual(unhandled, [])
    assert.strictEqual(worker.terminated, true)
    assert.deepStrictEqual(Object.keys(napiModule.PThread.pthreads), [])
    assert.strictEqual(errors.filter(text => text.includes('load failed after spawn')).length, 1)
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
}

// Cross-realm WebAssembly.{Module,Memory,Table} brand checks
{
  const crossModule = vm.runInNewContext('new WebAssembly.Module(bytes)', { bytes: wasm })
  assert.strictEqual(crossModule instanceof WebAssembly.Module, false)

  // loadAddonSync / instantiateAddonSync / loadAddon / instantiateAddon accept cross-realm WebAssembly.Module
  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    const source = emnapiCore.loadAddonSync(addonModule, crossModule)
    assert.strictEqual(source.module, crossModule)
    assert.strictEqual(addonModule.loaded, true)
  }
  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    const source = await emnapiCore.loadAddon(addonModule, crossModule)
    assert.strictEqual(source.module, crossModule)
    assert.strictEqual(addonModule.loaded, true)
  }
  {
    const source = emnapiCore.instantiateAddonSync(crossModule, { context: getDefaultContext() })
    assert.strictEqual(source.module, crossModule)
    assert.strictEqual(source.addonModule.loaded, true)
  }
  {
    const source = await emnapiCore.instantiateAddon(crossModule, { context: getDefaultContext() })
    assert.strictEqual(source.module, crossModule)
    assert.strictEqual(source.addonModule.loaded, true)
  }

  // Cross-realm Instance + Module + Memory + Table created inside another vm realm
  const crossRealm = vm.runInNewContext(`
    const mod = new WebAssembly.Module(bytes)
    const inst = new WebAssembly.Instance(mod)
    const mem = new WebAssembly.Memory({ initial: 1 })
    const tab = new WebAssembly.Table({ initial: 1, element: 'anyfunc' })
    // Materialize the ArrayBuffers inside the child realm so they stay
    // cross-realm even on V8 versions that lazily allocate memory.buffer in
    // the first caller's realm.
    void inst.exports.memory.buffer
    void mem.buffer
    ;({ mod, inst, mem, tab })
  `, { bytes: wasm })
  assert.strictEqual(crossRealm.mod instanceof WebAssembly.Module, false)
  assert.strictEqual(crossRealm.inst.exports.memory instanceof WebAssembly.Memory, false)
  assert.strictEqual(crossRealm.inst.exports.__indirect_function_table instanceof WebAssembly.Table, false)
  assert.strictEqual(crossRealm.mem instanceof WebAssembly.Memory, false)
  assert.strictEqual(crossRealm.tab instanceof WebAssembly.Table, false)

  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    addonModule.init({
      instance: crossRealm.inst,
      module: crossRealm.mod
    })
    assert.strictEqual(addonModule.loaded, true)
  }
  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    addonModule.init({
      instance: crossRealm.inst,
      module: crossRealm.mod,
      memory: crossRealm.mem,
      table: crossRealm.tab
    })
    assert.strictEqual(addonModule.loaded, true)
  }

  // loadAddonSync / loadAddon accept cross-realm ArrayBuffer as wasmInput
  const crossWasmAb = vm.runInNewContext(`
    const ab = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(ab).set(bytes)
    ab
  `, { bytes: wasm })
  assert.strictEqual(crossWasmAb instanceof ArrayBuffer, false)
  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    const source = emnapiCore.loadAddonSync(addonModule, crossWasmAb)
    assert.ok(source.instance instanceof WebAssembly.Instance)
    assert.strictEqual(addonModule.loaded, true)
  }
  {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    const source = await emnapiCore.loadAddon(addonModule, crossWasmAb)
    assert.ok(source.instance instanceof WebAssembly.Instance)
    assert.strictEqual(addonModule.loaded, true)
  }

  // Buffer APIs work with the addon's own cross-realm memory.buffer and other
  // cross-realm ArrayBuffer / SharedArrayBuffer values.
  {
    const context = createContext({ autoDestroy: false })
    const addonModule = emnapiCore.createAddonModule({ context })
    addonModule.init({
      instance: crossRealm.inst,
      module: crossRealm.mod,
      memory: crossRealm.mem,
      table: crossRealm.tab
    })
    const env = 64 + 8
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    try {
      const memBuf = crossRealm.mem.buffer
      assert.strictEqual(memBuf instanceof ArrayBuffer, false)

      const memAddr = addonModule.emnapi.getMemoryAddress(memBuf)
      assert.strictEqual(memAddr.address, 0)
      assert.strictEqual(memAddr.runtimeAllocated, 0)

      const dv = new DataView(memBuf)
      const u8 = new Uint8Array(memBuf)
      const boolPtr = 512
      const dataPtr = 520
      const lenPtr = 528
      const outPtr = 536

      const memBufHandle = context.napiValueFromJsValue(memBuf)
      assert.strictEqual(addonModule.imports.napi.napi_is_arraybuffer(env, memBufHandle, boolPtr), 0)
      assert.strictEqual(u8[boolPtr], 1)

      assert.strictEqual(addonModule.imports.napi.napi_get_arraybuffer_info(env, memBufHandle, dataPtr, lenPtr), 0)
      assert.strictEqual(dv.getUint32(dataPtr, true), 0)
      assert.strictEqual(dv.getUint32(lenPtr, true), memBuf.byteLength)

      // TypedArray, DataView, and Buffer created from cross-realm memory.buffer
      assert.strictEqual(addonModule.imports.napi.napi_create_typedarray(env, 1 /* napi_uint8_array */, 4, memBufHandle, 256, outPtr), 0)
      const ta = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
      assert.strictEqual(ta.buffer, memBuf)
      assert.strictEqual(ta.byteOffset, 256)
      assert.strictEqual(ta.byteLength, 4)

      assert.strictEqual(addonModule.imports.napi.napi_create_dataview(env, 4, memBufHandle, 256, outPtr), 0)
      const view = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
      assert.strictEqual(view.buffer, memBuf)
      assert.strictEqual(view.byteOffset, 256)
      assert.strictEqual(view.byteLength, 4)

      assert.strictEqual(addonModule.imports.napi.node_api_create_buffer_from_arraybuffer(env, memBufHandle, 256, 4, outPtr), 0)
      const nodeBuf = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
      assert.strictEqual(nodeBuf.buffer, memBuf)
      assert.strictEqual(nodeBuf.byteOffset, 256)
      assert.strictEqual(nodeBuf.byteLength, 4)

      // Separate cross-realm ArrayBuffer: info, syncMemory, getMemoryAddress, detach, isDetached
      const crossAb = vm.runInNewContext('const ab = new ArrayBuffer(8); new Uint8Array(ab).set([1, 2, 3, 4, 5, 6, 7, 8]); ab')
      assert.strictEqual(crossAb instanceof ArrayBuffer, false)
      const crossAbHandle = context.napiValueFromJsValue(crossAb)

      assert.strictEqual(addonModule.imports.napi.napi_is_arraybuffer(env, crossAbHandle, boolPtr), 0)
      assert.strictEqual(u8[boolPtr], 1)
      assert.strictEqual(addonModule.imports.napi.napi_is_detached_arraybuffer(env, crossAbHandle, boolPtr), 0)
      assert.strictEqual(u8[boolPtr], 0)

      assert.strictEqual(addonModule.imports.napi.napi_get_arraybuffer_info(env, crossAbHandle, dataPtr, lenPtr), 0)
      const mirrorAddr = dv.getUint32(dataPtr, true)
      assert.strictEqual(mirrorAddr, 1024)
      assert.strictEqual(dv.getUint32(lenPtr, true), 8)
      assert.deepStrictEqual([...u8.subarray(mirrorAddr, mirrorAddr + 8)], [1, 2, 3, 4, 5, 6, 7, 8])

      assert.strictEqual(addonModule.emnapi.getMemoryAddress(crossAb).address, mirrorAddr)
      u8[mirrorAddr] = 99
      addonModule.emnapi.syncMemory(false, crossAb)
      assert.strictEqual(new Uint8Array(crossAb)[0], 99)

      assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, crossAbHandle), 0)
      assert.strictEqual(crossAb.detached, true)
      assert.strictEqual(addonModule.imports.napi.napi_is_detached_arraybuffer(env, crossAbHandle, boolPtr), 0)
      assert.strictEqual(u8[boolPtr], 1)

      // Cross-realm SharedArrayBuffer
      if (typeof SharedArrayBuffer === 'function') {
        const crossSab = vm.runInNewContext('new SharedArrayBuffer(8)')
        assert.strictEqual(crossSab instanceof SharedArrayBuffer, false)
        const crossSabHandle = context.napiValueFromJsValue(crossSab)

        assert.strictEqual(addonModule.imports.napi.napi_is_arraybuffer(env, crossSabHandle, boolPtr), 0)
        assert.strictEqual(u8[boolPtr], 0)
        assert.strictEqual(addonModule.imports.napi.node_api_is_sharedarraybuffer(env, crossSabHandle, boolPtr), 0)
        assert.strictEqual(u8[boolPtr], 1)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, crossSabHandle), 20 /* napi_detachable_arraybuffer_expected */)
        assert.strictEqual(addonModule.emnapi.getMemoryAddress(crossSab).address, 0)
      }

      // Spoofed/proxied ArrayBuffer must be rejected
      for (const fakeAb of [Object.create(ArrayBuffer.prototype), new Proxy(new ArrayBuffer(4), {})]) {
        const fakeHandle = context.napiValueFromJsValue(fakeAb)
        assert.strictEqual(addonModule.imports.napi.napi_is_arraybuffer(env, fakeHandle, boolPtr), 0)
        assert.strictEqual(u8[boolPtr], 0)
        assert.strictEqual(addonModule.imports.napi.napi_get_arraybuffer_info(env, fakeHandle, dataPtr, lenPtr), 1 /* napi_invalid_arg */)
      }
    } finally {
      context.closeScope(envObj, scope)
      context.destroy()
    }
  }

  // Edge cases: non-WebAssembly values and spoofed/proxied objects must be rejected
  const realModule = new WebAssembly.Module(wasm)
  const realInstance = new WebAssembly.Instance(realModule)
  const realMemory = realInstance.exports.memory
  const realTable = realInstance.exports.__indirect_function_table

  for (const invalid of [null, undefined, 0, 'wasm', {}, Object.create(ArrayBuffer.prototype), new Proxy(new ArrayBuffer(4), {}), new Proxy({}, {})]) {
    assert.throws(() => emnapiCore.loadAddonSync(emnapiCore.createAddonModule({ context: getDefaultContext() }), invalid), TypeError)
  }
  for (const invalidModule of [null, undefined, 0, 'm', {}, Object.create(WebAssembly.Module.prototype), new Proxy({}, {}), new Proxy(realModule, {})]) {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    assert.throws(() => addonModule.init({ instance: realInstance, module: invalidModule, memory: realMemory, table: realTable }), /Invalid wasm module/)
  }
  const noMemOrTableInstance = { exports: {} }
  for (const invalidMemory of [null, undefined, 0, 1, 'm', {}, { buffer: new ArrayBuffer(0) }, Object.create(WebAssembly.Memory.prototype), new Proxy({}, {}), new Proxy(realMemory, {})]) {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    assert.throws(() => addonModule.init({ instance: noMemOrTableInstance, module: realModule, memory: invalidMemory, table: realTable }), /Invalid wasm memory/)
  }
  for (const invalidTable of [null, undefined, 0, 1, 't', {}, { length: 1, get () {}, set () {} }, Object.create(WebAssembly.Table.prototype), new Proxy({}, {}), new Proxy(realTable, {})]) {
    const addonModule = emnapiCore.createAddonModule({ context: getDefaultContext() })
    assert.throws(() => addonModule.init({ instance: noMemOrTableInstance, module: realModule, memory: realMemory, table: invalidTable }), /Invalid wasm table/)
  }
}

// Direct tests for emnapi_create_arraybuffer_copy and detachArrayBuffer paths (E1, E2, E3)
{
  // Helper to instantiate the minimal module and run a callback inside an open HandleScope
  function setupMinimalAddon (contextOptions, { failMalloc = false } = {}) {
    const context = createContext({ autoDestroy: false, ...contextOptions })
    const mod = new WebAssembly.Module(wasm)
    const rawInstance = new WebAssembly.Instance(mod)
    let mallocCalls = 0
    const memory = rawInstance.exports.memory
    const exports = {
      ...rawInstance.exports,
      malloc (size) {
        mallocCalls++
        if (failMalloc) throw new Error('unexpected malloc call')
        return rawInstance.exports.malloc(size)
      }
    }
    const addonModule = emnapiCore.createAddonModule({ context })
    addonModule.init({ instance: { exports }, module: mod, memory, table: rawInstance.exports.__indirect_function_table })
    const env = 64 + 8
    return {
      context,
      addonModule,
      memory,
      env,
      get mallocCalls () { return mallocCalls }
    }
  }

  // E1: emnapi_create_arraybuffer_copy works without Buffer, without FinalizationRegistry,
  // and without ever calling malloc or registering in emnapiExternalMemory.table.
  {
    const { context, addonModule, memory, env } = setupMinimalAddon(
      { features: { Buffer: undefined } },
      { failMalloc: true }
    )
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    try {
      const u8 = new Uint8Array(memory.buffer)
      const dv = new DataView(memory.buffer)
      const srcPtr = 256
      const outPtr = 512
      u8.set([11, 22, 33, 44, 55], srcPtr)

      const status = addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, srcPtr, 5, outPtr)
      assert.strictEqual(status, 0 /* napi_ok */)
      // Mutating wasm source after copy must not affect returned ArrayBuffer
      u8.set([0, 0, 0, 0, 0], srcPtr)

      const handle = dv.getUint32(outPtr, true)
      const ab = context.jsValueFromNapiValue(handle)
      assert.ok(ab instanceof ArrayBuffer)
      assert.strictEqual(ab.byteLength, 5)
      assert.deepStrictEqual([...new Uint8Array(ab)], [11, 22, 33, 44, 55])

      // Verify zero entry in emnapiExternalMemory.table via emnapi.getMemoryAddress
      const addrInfo = addonModule.emnapi.getMemoryAddress(ab)
      assert.strictEqual(addrInfo.address, 0)
      assert.strictEqual(addrInfo.runtimeAllocated, 0)

      // Zero-length copy with NULL data succeeds with non-detached empty ArrayBuffer
      assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, 0, 0, outPtr), 0)
      const emptyAb = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
      assert.ok(emptyAb instanceof ArrayBuffer)
      assert.strictEqual(emptyAb.byteLength, 0)
      assert.strictEqual(new Uint8Array(emptyAb).length, 0)

      // Invalid args
      assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(0, srcPtr, 5, outPtr), 1 /* napi_invalid_arg */)
      assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, srcPtr, 5, 0), 1 /* napi_invalid_arg */)
      assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, 0, 5, outPtr), 1 /* napi_invalid_arg */)

      // Out-of-range length sets pending RangeError
      assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, srcPtr, memory.buffer.byteLength, outPtr), 10 /* napi_pending_exception */)
      const err = envObj.lastException.deref()
      envObj.lastException.reset()
      assert.ok(err instanceof RangeError)
    } finally {
      context.closeScope(envObj, scope)
      context.destroy()
    }
  }

  // E1 & E2 regression: copying a range ending exactly at 4 GiB (0x100000000)
  // must copy the actual bytes rather than wrapping the end index to 0.
  {
    let mem4g
    try {
      mem4g = new WebAssembly.Memory({ initial: 65536, maximum: 65536 })
    } catch (_) {}
    if (mem4g) {
      const context = createContext({ autoDestroy: false })
      const mod = new WebAssembly.Module(wasm)
      const rawInstance = new WebAssembly.Instance(mod)
      const addonModule = emnapiCore.createAddonModule({ context })
      addonModule.init({
        instance: rawInstance,
        module: mod,
        memory: mem4g,
        table: rawInstance.exports.__indirect_function_table
      })
      const env = 64 + 8
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        const start = 4294967292 // 4 GiB - 4
        const outPtr = 512
        const dv = new DataView(mem4g.buffer)
        new Uint8Array(mem4g.buffer, start, 4).set([0xde, 0xad, 0xbe, 0xef])

        assert.strictEqual(addonModule.imports.emnapi.emnapi_create_arraybuffer_copy(env, start, 4, outPtr), 0)
        const ab = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
        assert.deepStrictEqual([...new Uint8Array(ab)], [0xde, 0xad, 0xbe, 0xef])

        assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 4, start, 0, outPtr), 0)
        const buf = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
        assert.deepStrictEqual([...buf], [0xde, 0xad, 0xbe, 0xef])
      } finally {
        context.closeScope(envObj, scope)
        context.destroy()
      }
    }
  }

  // E2: napi_create_buffer_copy populates *result_data with the copied bytes immediately,
  // and does not allocate a wasm mirror when result_data is NULL.
  {
    const addon = setupMinimalAddon({})
    const { context, addonModule, memory, env } = addon
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    try {
      const u8 = new Uint8Array(memory.buffer)
      const dv = new DataView(memory.buffer)
      const srcPtr = 256
      const resultDataPtr = 512
      const resultPtr = 520
      u8.set([72, 101, 108, 108, 111], srcPtr) // "Hello"

      // NULL result_data: zero malloc calls
      assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 5, srcPtr, 0, resultPtr), 0)
      assert.strictEqual(addon.mallocCalls, 0)
      const bufNoMirror = context.jsValueFromNapiValue(dv.getUint32(resultPtr, true))
      assert.deepStrictEqual([...bufNoMirror], [72, 101, 108, 108, 111])
      assert.strictEqual(addonModule.emnapi.getMemoryAddress(bufNoMirror).address, 0)

      // Non-NULL result_data: mirror immediately holds the copied bytes
      assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 5, srcPtr, resultDataPtr, resultPtr), 0)
      assert.strictEqual(addon.mallocCalls, 1)
      const mirrorPtr = dv.getUint32(resultDataPtr, true)
      assert.strictEqual(mirrorPtr, 1024)
      assert.deepStrictEqual([...u8.subarray(mirrorPtr, mirrorPtr + 5)], [72, 101, 108, 108, 111])

      // Mutating mirror + emnapi_sync_memory updates JS buffer
      u8[mirrorPtr] = 74 // 'J'
      const bufHandle = dv.getUint32(resultPtr, true)
      const bufWithMirror = context.jsValueFromNapiValue(bufHandle)
      addonModule.emnapi.syncMemory(false, bufWithMirror)
      assert.deepStrictEqual([...bufWithMirror], [74, 101, 108, 108, 111])
    } finally {
      context.closeScope(envObj, scope)
      context.destroy()
    }
  }

  // E2 regression: a custom Buffer.from that grows non-shared wasm memory
  // must not invalidate the source slice read by napi_create_buffer_copy.
  {
    let targetMemory
    const GrowingBuffer = {
      from (ab) {
        targetMemory.grow(1)
        return Buffer.from(ab)
      }
    }
    const { context, addonModule, memory, env } = setupMinimalAddon({
      features: { Buffer: GrowingBuffer }
    })
    targetMemory = memory
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    try {
      const srcPtr = 256
      const resultDataPtr = 512
      const resultPtr = 520
      new Uint8Array(memory.buffer).set([1, 2, 3, 4], srcPtr)
      const oldBuffer = memory.buffer

      assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 4, srcPtr, resultDataPtr, resultPtr), 0)
      assert.notStrictEqual(memory.buffer, oldBuffer, 'custom Buffer.from should have grown wasm memory')
      const dv = new DataView(memory.buffer)
      const buf = context.jsValueFromNapiValue(dv.getUint32(resultPtr, true))
      assert.deepStrictEqual([...buf], [1, 2, 3, 4])
      const mirrorPtr = dv.getUint32(resultDataPtr, true)
      assert.deepStrictEqual([...new Uint8Array(memory.buffer, mirrorPtr, 4)], [1, 2, 3, 4])
    } finally {
      context.closeScope(envObj, scope)
      context.destroy()
    }
  }

  // E3: napi_create_external_arraybuffer with len == 0 uses ArrayBuffer.prototype.transfer
  // (0 MESSAGEPORT handles, works even without MessageChannel), napi_detach_arraybuffer
  // honors markAsUntransferable / Node pooled Buffers with 0 MESSAGEPORT handles,
  // and the MessageChannel fallback closes both port1 and port2.
  {
    const { context, addonModule, memory, env } = setupMinimalAddon({ features: { MessageChannel: undefined } })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    let portsCreated = 0
    const hook = asyncHooks.createHook({
      init (_id, type) {
        if (type === 'MESSAGEPORT') portsCreated++
      }
    }).enable()
    try {
      const dv = new DataView(memory.buffer)
      const outPtr = 512
      assert.strictEqual(addonModule.imports.napi.napi_create_external_arraybuffer(env, 0, 0, 0, 0, outPtr), 0)
      const ab = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
      assert.ok(ab instanceof ArrayBuffer)
      assert.strictEqual(ab.byteLength, 0)
      assert.strictEqual(ab.detached, true)

      // Caller-supplied normal ArrayBuffer detaches cleanly with 0 MESSAGEPORT handles
      const normalAb = new ArrayBuffer(8)
      const normalHandle = context.napiValueFromJsValue(normalAb)
      assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, normalHandle), 0)
      assert.strictEqual(normalAb.detached, true)

      // Caller-supplied markAsUntransferable buffer must be rejected (not detached)
      const markedAb = new ArrayBuffer(8)
      markAsUntransferable(markedAb)
      const markedHandle = context.napiValueFromJsValue(markedAb)
      assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, markedHandle), 9 /* napi_generic_failure */)
      assert.strictEqual(markedAb.detached, false)

      // Node's pooled Buffer backing store must not be detached
      const pooledBuf = Buffer.from('hello')
      if (pooledBuf.buffer.byteLength > pooledBuf.byteLength) {
        const pooledHandle = context.napiValueFromJsValue(pooledBuf.buffer)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, pooledHandle), 9 /* napi_generic_failure */)
        assert.strictEqual(pooledBuf.buffer.detached, false)
        assert.strictEqual(Buffer.from('world').toString(), 'world')
      }

      assert.strictEqual(portsCreated, 0)
    } finally {
      hook.disable()
      context.closeScope(envObj, scope)
      context.destroy()
    }
  }

  {
    // Test MessageChannel fallback closes both ports
    const origTransferDesc = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'transfer')
    const origStructuredClone = globalThis.structuredClone
    const RealMessageChannel = globalThis.MessageChannel
    let channelsCreated = 0
    let port1Closed = 0
    let port2Closed = 0
    class TrackedMessageChannel {
      constructor () {
        channelsCreated++
        const real = new RealMessageChannel()
        const p1Close = real.port1.close.bind(real.port1)
        const p2Close = real.port2.close.bind(real.port2)
        real.port1.close = () => { port1Closed++; p1Close() }
        real.port2.close = () => { port2Closed++; p2Close() }
        this.port1 = real.port1
        this.port2 = real.port2
      }
    }
    try {
      Object.defineProperty(ArrayBuffer.prototype, 'transfer', { value: undefined, configurable: true, writable: true })
      globalThis.structuredClone = undefined
      const { context, addonModule, memory, env } = setupMinimalAddon({
        features: { MessageChannel: TrackedMessageChannel }
      })
      channelsCreated = 0
      port1Closed = 0
      port2Closed = 0
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        const dv = new DataView(memory.buffer)
        const outPtr = 512
        assert.strictEqual(addonModule.imports.napi.napi_create_external_arraybuffer(env, 0, 0, 0, 0, outPtr), 0)
        const ab = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
        assert.ok(ab instanceof ArrayBuffer)
        assert.strictEqual(ab.detached, true)
        assert.strictEqual(channelsCreated, 1)
        assert.strictEqual(port1Closed, 1)
        assert.strictEqual(port2Closed, 1)

        // napi_detach_arraybuffer on the fallback path also closes both ports
        const detachable = new ArrayBuffer(8)
        const handle = context.napiValueFromJsValue(detachable)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, handle), 0)
        assert.strictEqual(detachable.detached, true)
        assert.strictEqual(channelsCreated, 2)
        assert.strictEqual(port1Closed, 2)
        assert.strictEqual(port2Closed, 2)

        // Clone-only structuredClone polyfill (ignores transfer list) falls back to MessageChannel
        globalThis.structuredClone = (value) => value
        const polyfillTarget = new ArrayBuffer(8)
        const polyfillHandle = context.napiValueFromJsValue(polyfillTarget)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, polyfillHandle), 0)
        assert.strictEqual(polyfillTarget.detached, true)
        assert.strictEqual(channelsCreated, 3)
        assert.strictEqual(port1Closed, 3)
        assert.strictEqual(port2Closed, 3)

        // Throwing structuredClone polyfill falls back to MessageChannel (closing both ports)
        // for both napi_detach_arraybuffer and napi_create_external_arraybuffer(0), while
        // still rejecting Node-marked and pooled buffers.
        globalThis.structuredClone = () => { throw new TypeError('polyfill failed') }
        const throwingTarget = new ArrayBuffer(8)
        const throwingHandle = context.napiValueFromJsValue(throwingTarget)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, throwingHandle), 0)
        assert.strictEqual(throwingTarget.detached, true)
        assert.strictEqual(channelsCreated, 4)
        assert.strictEqual(port1Closed, 4)
        assert.strictEqual(port2Closed, 4)

        assert.strictEqual(addonModule.imports.napi.napi_create_external_arraybuffer(env, 0, 0, 0, 0, outPtr), 0)
        const abFromThrowingClone = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
        assert.ok(abFromThrowingClone instanceof ArrayBuffer)
        assert.strictEqual(abFromThrowingClone.detached, true)
        assert.strictEqual(channelsCreated, 5)
        assert.strictEqual(port1Closed, 5)
        assert.strictEqual(port2Closed, 5)

        const markedOnFallback = new ArrayBuffer(8)
        markAsUntransferable(markedOnFallback)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, context.napiValueFromJsValue(markedOnFallback)), 9)
        assert.strictEqual(markedOnFallback.detached, false)
        assert.strictEqual(channelsCreated, 6)
        assert.strictEqual(port1Closed, 6)
        assert.strictEqual(port2Closed, 6)

        const pooledOnFallback = Buffer.from('hello')
        if (pooledOnFallback.buffer.byteLength > pooledOnFallback.byteLength) {
          assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, context.napiValueFromJsValue(pooledOnFallback.buffer)), 9)
          assert.strictEqual(pooledOnFallback.buffer.detached, false)
          assert.strictEqual(channelsCreated, 7)
          assert.strictEqual(port1Closed, 7)
          assert.strictEqual(port2Closed, 7)
        }
      } finally {
        context.closeScope(envObj, scope)
        context.destroy()
      }
    } finally {
      if (origTransferDesc) Object.defineProperty(ArrayBuffer.prototype, 'transfer', origTransferDesc)
      globalThis.structuredClone = origStructuredClone
    }
  }

  // E3 regression: a copy-only or throwing ArrayBuffer.prototype.transfer shim
  // must fall through to structuredClone and then MessageChannel instead of
  // returning an attached 0-length ArrayBuffer from napi_create_external_arraybuffer.
  for (const [label, transferShim] of [
    ['copy-only transfer shim', function () { return new ArrayBuffer(0) }],
    ['throwing transfer shim', function () { throw new TypeError('transfer shim failed') }]
  ]) {
    const origTransferDesc = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'transfer')
    const origStructuredClone = globalThis.structuredClone
    const RealMessageChannel = globalThis.MessageChannel
    let shimCalls = 0
    let channelsCreated = 0
    let port1Closed = 0
    let port2Closed = 0
    class TrackedMessageChannel {
      constructor () {
        channelsCreated++
        const real = new RealMessageChannel()
        const p1Close = real.port1.close.bind(real.port1)
        const p2Close = real.port2.close.bind(real.port2)
        real.port1.close = () => { port1Closed++; p1Close() }
        real.port2.close = () => { port2Closed++; p2Close() }
        this.port1 = real.port1
        this.port2 = real.port2
      }
    }
    try {
      Object.defineProperty(ArrayBuffer.prototype, 'transfer', {
        value: function (...args) {
          shimCalls++
          return transferShim.apply(this, args)
        },
        configurable: true,
        writable: true
      })

      // Fall through to structuredClone (no MessageChannel needed)
      {
        const { context, addonModule, memory, env } = setupMinimalAddon({
          features: { MessageChannel: undefined }
        })
        const envObj = context.getEnv(1)
        const scope = context.openScope(envObj)
        try {
          const dv = new DataView(memory.buffer)
          const outPtr = 512
          assert.strictEqual(addonModule.imports.napi.napi_create_external_arraybuffer(env, 0, 0, 0, 0, outPtr), 0, label)
          const ab = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
          assert.ok(ab instanceof ArrayBuffer, label)
          assert.strictEqual(ab.byteLength, 0, label)
          assert.strictEqual(ab.detached, true, label)
          assert.strictEqual(shimCalls, 1, label)
        } finally {
          context.closeScope(envObj, scope)
          context.destroy()
        }
      }

      // Fall through to MessageChannel when structuredClone is absent (and close both ports)
      {
        globalThis.structuredClone = undefined
        const { context, addonModule, memory, env } = setupMinimalAddon({
          features: { MessageChannel: TrackedMessageChannel }
        })
        channelsCreated = 0
        port1Closed = 0
        port2Closed = 0
        const envObj = context.getEnv(1)
        const scope = context.openScope(envObj)
        try {
          const dv = new DataView(memory.buffer)
          const outPtr = 512
          assert.strictEqual(addonModule.imports.napi.napi_create_external_arraybuffer(env, 0, 0, 0, 0, outPtr), 0, label)
          const ab = context.jsValueFromNapiValue(dv.getUint32(outPtr, true))
          assert.ok(ab instanceof ArrayBuffer, label)
          assert.strictEqual(ab.byteLength, 0, label)
          assert.strictEqual(ab.detached, true, label)
          assert.strictEqual(shimCalls, 2, label)
          assert.strictEqual(channelsCreated, 1, label)
          assert.strictEqual(port1Closed, 1, label)
          assert.strictEqual(port2Closed, 1, label)
        } finally {
          context.closeScope(envObj, scope)
          context.destroy()
        }
      }
    } finally {
      if (origTransferDesc) Object.defineProperty(ArrayBuffer.prototype, 'transfer', origTransferDesc)
      globalThis.structuredClone = origStructuredClone
    }
  }

  // E2 regression: a custom copying Buffer.from must tie *result_data to the
  // returned buffer's backing ArrayBuffer (not the temporary arrayBuffer), and
  // length === 0 must write 0 without mirroring a backing slab.
  {
    const RealFinalizationRegistry = globalThis.FinalizationRegistry
    const registrations = []
    class TrackingFinalizationRegistry extends RealFinalizationRegistry {
      register (target, heldValue, unregisterToken) {
        registrations.push({ target, heldValue })
        return super.register(target, heldValue, unregisterToken)
      }
    }
    const CopyingBuffer = {
      from (ab) {
        const backing = new ArrayBuffer(16)
        const view = new Uint8Array(backing, 4, ab.byteLength)
        view.set(new Uint8Array(ab))
        return view
      }
    }
    let freeCalls = 0
    globalThis.FinalizationRegistry = TrackingFinalizationRegistry
    try {
      const context = createContext({
        autoDestroy: false,
        features: { Buffer: CopyingBuffer }
      })
      const mod = new WebAssembly.Module(wasm)
      const rawInstance = new WebAssembly.Instance(mod)
      const memory = rawInstance.exports.memory
      let mallocCalls = 0
      const exports = {
        ...rawInstance.exports,
        malloc (size) {
          mallocCalls++
          return rawInstance.exports.malloc(size)
        },
        free (ptr) {
          freeCalls++
          return rawInstance.exports.free(ptr)
        }
      }
      const addonModule = emnapiCore.createAddonModule({ context })
      addonModule.init({ instance: { exports }, module: mod, memory, table: rawInstance.exports.__indirect_function_table })
      const env = 64 + 8
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        const srcPtr = 256
        const resultDataPtr = 512
        const resultPtr = 520
        const u8 = new Uint8Array(memory.buffer)
        const dv = new DataView(memory.buffer)
        u8.set([10, 20, 30, 40], srcPtr)

        // length === 0 with non-NULL result_data writes 0 and allocates nothing
        dv.setUint32(resultDataPtr, 0x12345678, true)
        assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 0, 0, resultDataPtr, resultPtr), 0)
        assert.strictEqual(dv.getUint32(resultDataPtr, true), 0)
        assert.strictEqual(mallocCalls, 0)

        // length > 0 with copying Buffer.from ties mirror to buf.buffer + byteOffset
        assert.strictEqual(addonModule.imports.napi.napi_create_buffer_copy(env, 4, srcPtr, resultDataPtr, resultPtr), 0)
        assert.strictEqual(mallocCalls, 1)
        const buf = context.jsValueFromNapiValue(dv.getUint32(resultPtr, true))
        const mirrorPtr = dv.getUint32(resultDataPtr, true)
        assert.strictEqual(mirrorPtr, 1024 + 4)
        assert.deepStrictEqual([...u8.subarray(mirrorPtr, mirrorPtr + 4)], [10, 20, 30, 40])
        assert.strictEqual(addonModule.emnapi.getMemoryAddress(buf).address, mirrorPtr)
        assert.strictEqual(registrations.length, 1)
        assert.strictEqual(registrations[0].target, buf.buffer)

        // Syncing from mirror updates returned buffer
        u8[mirrorPtr] = 99
        addonModule.emnapi.syncMemory(false, buf)
        assert.deepStrictEqual([...buf], [99, 20, 30, 40])

        // Retained buffer keeps mirror live across GC
        if (typeof globalThis.gc === 'function') {
          globalThis.gc()
          await new Promise(resolve => setImmediate(resolve))
          globalThis.gc()
          assert.strictEqual(freeCalls, 0)
          assert.strictEqual(buf[0], 99)
        }
      } finally {
        context.closeScope(envObj, scope)
        context.destroy()
      }
    } finally {
      globalThis.FinalizationRegistry = RealFinalizationRegistry
    }
  }

  // E3 regression: (a) structuredClone wrapper that transfers and then throws
  // still succeeds, and (b) a throwing port1.close() still closes port2 and
  // succeeds when detachment happened.
  {
    const origStructuredClone = globalThis.structuredClone
    const RealMessageChannel = globalThis.MessageChannel
    let port1CloseCalls = 0
    let port2CloseCalls = 0
    class ThrowingCloseMessageChannel {
      constructor () {
        const real = new RealMessageChannel()
        const p1Close = real.port1.close.bind(real.port1)
        const p2Close = real.port2.close.bind(real.port2)
        real.port1.close = () => {
          port1CloseCalls++
          p1Close()
          throw new Error('port1 close failed')
        }
        real.port2.close = () => {
          port2CloseCalls++
          p2Close()
        }
        this.port1 = real.port1
        this.port2 = real.port2
      }
    }
    try {
      const { context, addonModule, env } = setupMinimalAddon({
        features: { MessageChannel: ThrowingCloseMessageChannel }
      })
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        // (a) structuredClone transfers then throws
        globalThis.structuredClone = (value, opts) => {
          origStructuredClone(value, opts)
          throw new Error('post-transfer error')
        }
        const ab1 = new ArrayBuffer(8)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, context.napiValueFromJsValue(ab1)), 0)
        assert.strictEqual(ab1.detached, true)
        assert.strictEqual(port1CloseCalls, 0)

        // (b) MessageChannel fallback where port1.close() throws still closes port2
        globalThis.structuredClone = undefined
        const ab2 = new ArrayBuffer(8)
        assert.strictEqual(addonModule.imports.napi.napi_detach_arraybuffer(env, context.napiValueFromJsValue(ab2)), 0)
        assert.strictEqual(ab2.detached, true)
        assert.strictEqual(port1CloseCalls, 1)
        assert.strictEqual(port2CloseCalls, 1)
      } finally {
        context.closeScope(envObj, scope)
        context.destroy()
      }
    } finally {
      globalThis.structuredClone = origStructuredClone
    }
  }

  // E5 / isSharedArrayBuffer regression: when SharedArrayBuffer is hidden at
  // init, a throwing Symbol.toStringTag getter must not escape napi_detach_arraybuffer.
  {
    const origSabDesc = Object.getOwnPropertyDescriptor(globalThis, 'SharedArrayBuffer')
    try {
      Object.defineProperty(globalThis, 'SharedArrayBuffer', {
        value: undefined,
        configurable: true,
        writable: true
      })
      const { context, addonModule, env, memory } = setupMinimalAddon({})
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        const hostile = {
          get [Symbol.toStringTag] () {
            throw new Error('boom')
          }
        }
        assert.strictEqual(
          addonModule.imports.napi.napi_detach_arraybuffer(env, context.napiValueFromJsValue(hostile)),
          19 /* napi_arraybuffer_expected */
        )

        // Genuine Wasm-backed TypedArray with a spoofed SharedArrayBuffer tag
        // must still be classified as a view without invoking its tag getter.
        const taggedView = new Uint8Array(memory.buffer, 64, 8)
        let tagRead = false
        Object.defineProperty(taggedView, Symbol.toStringTag, {
          get () {
            tagRead = true
            return 'SharedArrayBuffer'
          }
        })
        const addr = addonModule.emnapi.getMemoryAddress(taggedView)
        assert.strictEqual(addr.address, 64)
        assert.strictEqual(tagRead, false)
      } finally {
        context.closeScope(envObj, scope)
        context.destroy()
      }
    } finally {
      if (origSabDesc) Object.defineProperty(globalThis, 'SharedArrayBuffer', origSabDesc)
    }
  }
}
