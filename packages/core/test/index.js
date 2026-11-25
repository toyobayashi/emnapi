import assert from 'node:assert/strict'
import asyncHooks from 'node:async_hooks'
import { EventEmitter } from 'node:events'
import vm from 'node:vm'
import { markAsUntransferable } from 'node:worker_threads'
import { createContext, getDefaultContext } from '@emnapi/runtime'
import * as emnapiCore from '@emnapi/core'
import { instantiateNapiModuleSync } from '@emnapi/core'
import { v8 as v8Plugin, asyncWork as asyncWorkPlugin, tsfn as tsfnPlugin } from '@emnapi/core/plugins'

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

// E6: Crash-latch Wasm re-entry gates and main-thread TSFN / pending-task drain
{
  function setupInstrumentedAddon ({
    contextOptions = {},
    createOptions = {},
    sharedMemory = false,
    memoryPages = 4,
    tableCallbacks = {}
  } = {}) {
    const context = createContext({ autoDestroy: false, ...contextOptions })
    const mod = new WebAssembly.Module(wasm)
    const rawInstance = new WebAssembly.Instance(mod)
    const memory = new WebAssembly.Memory(
      sharedMemory
        ? { initial: memoryPages, maximum: memoryPages, shared: true }
        : { initial: memoryPages, maximum: memoryPages }
    )
    const table = new WebAssembly.Table({ initial: 16, element: 'anyfunc' })
    const origTableGet = table.get.bind(table)
    Object.defineProperty(table, 'get', {
      configurable: true,
      value (index) {
        if (index in tableCallbacks) return tableCallbacks[index]
        return origTableGet(index)
      }
    })

    let nextAlloc = 2048
    const freed = []
    let deleteEnvCalls = 0
    const exports = {
      ...rawInstance.exports,
      memory,
      __indirect_function_table: table,
      malloc (size) {
        const aligned = (Number(size) + 7) & ~7
        const ptr = nextAlloc
        nextAlloc += Math.max(aligned, 8)
        return ptr
      },
      free (ptr) {
        freed.push(Number(ptr))
      },
      emnapi_delete_env () {
        deleteEnvCalls++
      }
    }
    const addonModule = emnapiCore.createAddonModule({ context, ...createOptions })
    addonModule.init({ instance: { exports }, module: mod, memory, table })
    const env = 64 + 8
    return {
      context,
      addonModule,
      memory,
      table,
      env,
      freed,
      get deleteEnvCalls () { return deleteEnvCalls }
    }
  }

  // 1. _emnapi_set_immediate, _emnapi_next_tick, emnapiAddSendListener (type 0 & 1):
  //    flush() drains stalled tasks without double-run; abort() blocks all re-entry.
  {
    const queued = []
    const calls = []
    const { context, addonModule } = setupInstrumentedAddon({
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      tableCallbacks: {
        1: (data) => { calls.push(['cb1', data]) },
        2: (data) => { calls.push(['cb2', data]) }
      }
    })
    const worker = new FakeWorker()
    addonModule.emnapi.addSendListener(worker)

    addonModule.imports.env._emnapi_set_immediate(1, 10)
    addonModule.imports.env._emnapi_next_tick(2, 20)
    worker.emit('message', { __emnapi__: { type: 'async-send', payload: { type: 0, callback: 1, data: 30 } } })
    worker.emit('message', { __emnapi__: { type: 'async-send', payload: { type: 1, callback: 2, data: 40 } } })
    assert.strictEqual(context.hasPendingWork(), true)
    context.flush()
    assert.deepStrictEqual(calls, [['cb1', 10], ['cb2', 20], ['cb1', 30], ['cb2', 40]])
    assert.strictEqual(context.hasPendingWork(), false)

    // Firing stalled immediates & microtasks must not double-run
    for (const fn of queued.splice(0)) fn()
    await Promise.resolve()
    assert.strictEqual(calls.length, 4)

    // Now queue again, abort, and verify zero Wasm re-entry (both already-queued and new messages)
    calls.length = 0
    addonModule.imports.env._emnapi_set_immediate(1, 50)
    addonModule.imports.env._emnapi_next_tick(2, 60)
    worker.emit('message', { __emnapi__: { type: 'async-send', payload: { type: 0, callback: 1, data: 70 } } })
    worker.emit('message', { __emnapi__: { type: 'async-send', payload: { type: 1, callback: 2, data: 80 } } })
    context.abort()
    worker.emit('message', { __emnapi__: { type: 'async-send', payload: { type: 0, callback: 1, data: 90 } } })
    for (const fn of queued.splice(0)) fn()
    await Promise.resolve()
    assert.deepStrictEqual(calls, [])
  }

  // 2. _emnapi_after_uvthreadpool_ready post-abort gate (both pending and ready paths)
  {
    let uvCalls = 0
    const { context, addonModule, memory } = setupInstrumentedAddon({
      tableCallbacks: {
        1: () => { uvCalls++ }
      }
    })
    const worker = new FakeWorker()
    const tid = 99
    addonModule.PThread.pthreads[tid] = worker
    const dv = new DataView(memory.buffer)
    // pthread struct at 512 with tid at offset 20, threads pointer array at 600
    dv.setInt32(512 + 20, tid, true)
    dv.setUint32(600, 512, true)
    addonModule.imports.env._emnapi_tell_js_uvthreadpool(600, 1)
    addonModule.imports.env._emnapi_after_uvthreadpool_ready(1, 123, 0)
    context.abort()
    worker.emit('message', { __emnapi__: { type: 'async-thread-ready', payload: {} } })
    await Promise.resolve()
    await Promise.resolve()
    // Also test the already-ready fast path after abort
    addonModule.imports.env._emnapi_after_uvthreadpool_ready(1, 456, 0)
    assert.strictEqual(uvCalls, 0)
  }

  // 3. emnapiExternalMemory.registry & emnapiExternalSAB.registry post-abort gates,
  //    plus child-thread registry safety without context.
  {
    const RealFR = globalThis.FinalizationRegistry
    const captured = []
    class CapturingFR {
      constructor (cb) {
        this._cb = cb
        this._held = []
        captured.push(this)
      }

      register (_target, held) {
        this._held.push(held)
      }

      unregister () {}
      fireAll () {
        for (const held of this._held.splice(0)) this._cb(held)
      }
    }
    globalThis.FinalizationRegistry = CapturingFR
    try {
      let sabFinalizeCalls = 0
      const { context, addonModule, memory, env, freed } = setupInstrumentedAddon({
        sharedMemory: true,
        tableCallbacks: {
          1: () => { sabFinalizeCalls++ }
        }
      })
      const envObj = context.getEnv(1)
      const scope = context.openScope(envObj)
      try {
        // Trigger emnapiExternalMemory.registry registration
        const jsAb = new ArrayBuffer(16)
        const abHandle = context.napiValueFromJsValue(jsAb)
        assert.strictEqual(addonModule.imports.napi.napi_get_arraybuffer_info(env, abHandle, 512, 520), 0)

        // Trigger emnapiExternalSAB.registry registration
        if (typeof SharedArrayBuffer === 'function') {
          assert.strictEqual(addonModule.imports.napi.node_api_create_external_sharedarraybuffer(env, 1024, 16, 1, 77, 528), 0)
        }
      } finally {
        context.closeScope(envObj, scope)
      }

      context.abort()
      for (const fr of captured) fr.fireAll()
      assert.strictEqual(freed.length, 0)
      assert.strictEqual(sabFinalizeCalls, 0)

      // Child thread without context: FinalizationRegistry callback must not throw
      // ReferenceError and must still free cleanly.
      captured.length = 0
      const childMod = new WebAssembly.Module(wasm)
      const childInst = new WebAssembly.Instance(childMod)
      const childFreed = []
      const childAddon = emnapiCore.createAddonModule({
        childThread: true,
        postMessage () {}
      })
      childAddon.init({
        instance: {
          exports: {
            ...childInst.exports,
            free (ptr) { childFreed.push(Number(ptr)) }
          }
        },
        module: childMod,
        memory: childInst.exports.memory,
        table: childInst.exports.__indirect_function_table
      })
      // Invoke the child addon's emnapiExternalMemory.registry callback directly
      assert.ok(captured.length >= 1)
      captured[0]._cb(4096)
      assert.deepStrictEqual(childFreed, [4096])
    } finally {
      globalThis.FinalizationRegistry = RealFR
    }
  }

  // 4. JS TSFN plugin: flush() / drain() (1 call, >1000 calls, chained Promise ->
  //    TSFN -> release -> finalize with stalled setImmediate, mid-flush abort,
  //    and post-abort gates on Turn 1, Turn 2, finalize, and tsfn-send).
  {
    const queued = []
    const received = []
    let finalizeCount = 0
    const { context, addonModule, memory, env, freed } = setupInstrumentedAddon({
      sharedMemory: true,
      memoryPages: 8,
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      createOptions: { plugins: [tsfnPlugin] },
      tableCallbacks: {
        1: (_env, _jsCb, _ctx, data) => { received.push(data) },
        2: () => { finalizeCount++ }
      }
    })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const tsfnOutPtr = 512
    const nameHandle = context.napiValueFromJsValue('tsfn-drain-test')
    assert.strictEqual(
      addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, tsfnOutPtr),
      0
    )
    const tsfnPtr = dv.getUint32(tsfnOutPtr, true)

    // 4a. Single call flushed synchronously with stalled setImmediate
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfnPtr, 42, 0), 0)
    assert.strictEqual(context.hasPendingWork(), true)
    context.flush()
    assert.deepStrictEqual(received, [42])
    assert.strictEqual(context.hasPendingWork(), false)
    // Stalled Turn 1 setImmediate fires later: must be a no-op (no double-run)
    for (const fn of queued.splice(0)) fn()
    assert.deepStrictEqual(received, [42])

    // 4b. >1000 calls (crosses the 1000-iteration dispatch() cap) drained by a single flush()
    received.length = 0
    for (let i = 1; i <= 1205; i++) {
      assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfnPtr, i, 0), 0)
    }
    assert.strictEqual(context.hasPendingWork(), true)
    context.flush()
    assert.strictEqual(received.length, 1205)
    assert.strictEqual(received[0], 1)
    assert.strictEqual(received[1204], 1205)
    assert.strictEqual(context.hasPendingWork(), false)
    for (const fn of queued.splice(0)) fn()
    assert.strictEqual(received.length, 1205)

    // 4c. Chained Promise -> follow-up TSFN call -> release -> finalize via drain()
    received.length = 0
    const tsfnOut2 = 520
    let resolveChain
    const chainPromise = new Promise(resolve => { resolveChain = resolve })
    const chainEvents = []
    const jsCallback = () => {
      chainEvents.push('js-cb')
      resolveChain()
    }
    const jsCbHandle = context.napiValueFromJsValue(jsCallback)
    assert.strictEqual(
      addonModule.imports.napi.napi_create_threadsafe_function(env, jsCbHandle, 0, nameHandle, 0, 1, 0, 2, 0, 0, tsfnOut2),
      0
    )
    const tsfn2 = dv.getUint32(tsfnOut2, true)
    chainPromise.then(() => {
      chainEvents.push('promise-then')
      assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn2, 0, 0), 0)
      assert.strictEqual(addonModule.imports.napi.napi_release_threadsafe_function(tsfn2, 0), 0)
    })
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn2, 0, 0), 0)
    await context.drain()
    assert.deepStrictEqual(chainEvents, ['js-cb', 'promise-then', 'js-cb'])
    assert.strictEqual(finalizeCount, 1)
    assert.ok(freed.includes(tsfn2))
    assert.strictEqual(context.hasPendingWork(), false)
    // Firing all stalled setImmediate turns after destroy must not re-run or throw
    for (const fn of queued.splice(0)) fn()
    assert.strictEqual(finalizeCount, 1)

    // Release first TSFN and drain cleanly
    assert.strictEqual(addonModule.imports.napi.napi_release_threadsafe_function(tsfnPtr, 0), 0)
    await context.drain()
    assert.strictEqual(finalizeCount, 2)
    assert.ok(freed.includes(tsfnPtr))
    context.closeScope(envObj, scope)
    context.destroy()
  }

  // 4d. TSFN post-abort gates (Turn 1, Turn 2, closeHandlesAndMaybeDelete finalize,
  //     and tsfn-send worker message)
  {
    const queued = []
    let cbCalls = 0
    let finalizeCalls = 0
    const worker = new FakeWorker()
    const { context, addonModule, memory, env, freed } = setupInstrumentedAddon({
      sharedMemory: true,
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      createOptions: {
        reuseWorker: 0,
        onCreateWorker: () => worker,
        plugins: [tsfnPlugin]
      },
      tableCallbacks: {
        1: () => { cbCalls++ },
        2: () => { finalizeCalls++ }
      }
    })
    // Attach emnapiTSFN's worker listener via PThread.getNewWorker
    addonModule.PThread.setup(new WebAssembly.Module(wasm), memory)
    const listenedWorker = addonModule.PThread.getNewWorker()
    assert.strictEqual(listenedWorker, worker)

    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const nameHandle = context.napiValueFromJsValue('tsfn-abort-test')

    // TSFN B: queued at Turn 1 when abort happens
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 520), 0)
    const tsfnB = dv.getUint32(520, true)
    // TSFN C: advanced to Turn 2 when abort happens
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 528), 0)
    const tsfnC = dv.getUint32(528, true)
    // TSFN D: queued for finalize via closeHandlesAndMaybeDelete when abort happens
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 536), 0)
    const tsfnD = dv.getUint32(536, true)

    // Advance tsfnC from Turn 1 -> Turn 2
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfnC, 1, 0), 0)
    assert.strictEqual(queued.length, 1)
    queued.shift()() // runs Turn 1, queues Turn 2
    assert.strictEqual(queued.length, 1)

    // Queue tsfnB at Turn 1
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfnB, 2, 0), 0)

    // Release tsfnD and advance through dispatchOne -> closeHandlesAndMaybeDelete -> finalize immediate
    assert.strictEqual(addonModule.imports.napi.napi_release_threadsafe_function(tsfnD, 0), 0)
    // Drain tsfnD Turn 1 -> Turn 2 (which schedules finalize immediate) without touching tsfnB/tsfnC
    const tsfnDTurn1 = queued.pop()
    tsfnDTurn1() // queues tsfnD Turn 2
    const tsfnDTurn2 = queued.pop()
    tsfnDTurn2() // runs dispatchOne -> closeHandlesAndMaybeDelete -> queues finalize immediate

    const freedAtAbort = freed.length
    context.abort()

    // Firing all queued Turn 1, Turn 2, and finalize immediates, plus a worker
    // tsfn-send message after abort must all be strict no-ops.
    for (const fn of queued.splice(0)) fn()
    worker.emit('message', { __emnapi__: { type: 'tsfn-send', payload: { tsfn: tsfnB } } })
    assert.strictEqual(cbCalls, 0)
    assert.strictEqual(finalizeCalls, 0)
    assert.strictEqual(freed.length, freedAtAbort)
    context.closeScope(envObj, scope)
  }

  // 4e. TSFN mid-flush abort inside callback stops remaining items on the SAME
  //     TSFN as well as subsequent TSFNs.
  {
    const queued = []
    const seen = []
    let finalizeCalls = 0
    const { context, addonModule, memory, env, freed } = setupInstrumentedAddon({
      sharedMemory: true,
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      createOptions: { plugins: [tsfnPlugin] },
      tableCallbacks: {
        1: (_env, _jsCb, _ctx, data) => {
          seen.push(data)
          if (data === 1) context.abort()
        },
        2: () => { finalizeCalls++ }
      }
    })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const nameHandle = context.napiValueFromJsValue('tsfn-mid-abort')
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 512), 0)
    const tsfn1 = dv.getUint32(512, true)
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 520), 0)
    const tsfn2 = dv.getUint32(520, true)
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn1, 1, 0), 0)
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn1, 2, 0), 0)
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn1, 3, 0), 0)
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(tsfn2, 4, 0), 0)
    const freedBefore = freed.length
    context.flush()
    assert.deepStrictEqual(seen, [1])
    assert.strictEqual(finalizeCalls, 0)
    for (const fn of queued.splice(0)) fn()
    assert.deepStrictEqual(seen, [1])
    assert.strictEqual(finalizeCalls, 0)
    assert.strictEqual(freed.length, freedBefore + 1, 'only the single popped queue node before abort may be freed')
    context.closeScope(envObj, scope)
  }

  // 4f. Nested context.flush() inside an active TSFN's final callback (both from
  //     outer flush() and from direct setImmediate Turn 2) must NOT finalize or
  //     free the TSFN before the active callback returns.
  for (const mode of ['flush', 'setImmediate']) {
    const queued = []
    const events = []
    let finalizeCalls = 0
    let activeTsfn = 0
    const { context, addonModule, memory, env, freed } = setupInstrumentedAddon({
      sharedMemory: true,
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      createOptions: { plugins: [tsfnPlugin] },
      tableCallbacks: {
        1: () => {
          events.push('cb-start')
          context.flush()
          assert.strictEqual(finalizeCalls, 0, `${mode}: finalize must not run during active callback`)
          assert.strictEqual(freed.includes(activeTsfn), false, `${mode}: tsfn must not be freed during active callback`)
          events.push('cb-end')
        },
        2: () => {
          finalizeCalls++
          events.push('finalize')
        }
      }
    })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const nameHandle = context.napiValueFromJsValue(`tsfn-nested-flush-${mode}`)
    assert.strictEqual(addonModule.imports.napi.napi_create_threadsafe_function(env, 0, 0, nameHandle, 0, 1, 0, 2, 0, 1, 512), 0)
    activeTsfn = dv.getUint32(512, true)
    assert.strictEqual(addonModule.imports.napi.napi_call_threadsafe_function(activeTsfn, 1, 0), 0)
    assert.strictEqual(addonModule.imports.napi.napi_release_threadsafe_function(activeTsfn, 0), 0)

    if (mode === 'flush') {
      context.flush()
    } else {
      assert.strictEqual(queued.length, 1)
      queued.shift()() // Turn 1 -> queues Turn 2
      assert.strictEqual(queued.length, 1)
      queued.shift()() // Turn 2 -> runs active callback (which calls nested flush())
      assert.strictEqual(finalizeCalls, 0, 'finalize should be deferred until after dispatch()')
      assert.strictEqual(context.hasPendingWork(), true)
      context.flush()
    }

    assert.deepStrictEqual(events, ['cb-start', 'cb-end', 'finalize'])
    assert.strictEqual(finalizeCalls, 1)
    assert.ok(freed.includes(activeTsfn))
    for (const fn of queued.splice(0)) fn()
    assert.strictEqual(finalizeCalls, 1)
    context.closeScope(envObj, scope)
    context.destroy()
  }

  // 5. AsyncWork (single-thread emnapiAWST + multi-thread emnapiAWMT) gates & cancelWork flush
  {
    // 5a. Single-thread emnapiAWST: flush() does NOT run unstarted execute body;
    //     abort() gates execute, complete, and cancel immediates.
    const queued = []
    let execCalls = 0
    let completeCalls = 0
    const { context, addonModule, memory, env } = setupInstrumentedAddon({
      contextOptions: {
        features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
      },
      createOptions: { asyncWorkPoolSize: 0, plugins: [asyncWorkPlugin] },
      tableCallbacks: {
        1: () => { execCalls++ },
        2: () => { completeCalls++ }
      }
    })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const nameHandle = context.napiValueFromJsValue('awst-test')
    const workIds = []
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(addonModule.imports.napi.napi_create_async_work(env, 0, nameHandle, 1, 2, i, 512), 0)
      const id = dv.getUint32(512, true)
      workIds.push(id)
      assert.strictEqual(addonModule.imports.napi.napi_queue_async_work(env, id), 0)
    }
    assert.strictEqual(context.hasPendingWork(), false, 'emnapiAWST.queue must not register unstarted execute body in pendingTasks')
    context.flush()
    assert.strictEqual(execCalls, 0)

    // Cancel the 5th (pending) work item; its cancel completion immediate is also gated by abort()
    assert.strictEqual(addonModule.imports.napi.napi_cancel_async_work(env, workIds[4]), 0)
    // Run execute of work 0 -> queues its complete immediate, then abort before complete runs
    queued.shift()()
    assert.strictEqual(execCalls, 1)
    assert.strictEqual(completeCalls, 0)

    context.abort()
    for (const fn of queued.splice(0)) fn()
    assert.strictEqual(execCalls, 1)
    assert.strictEqual(completeCalls, 0)
    context.closeScope(envObj, scope)
  }

  {
    // 5b. Multi-thread emnapiAWMT: cancelWork registers in pendingTasks for flush(),
    //     and abort() blocks both cancelWork and async-work-complete worker messages.
    const queued = []
    const completed = []
    const worker = new FakeWorker()
    const mod = new WebAssembly.Module(wasm)
    const rawInstance = new WebAssembly.Instance(mod)
    const memory = new WebAssembly.Memory({ initial: 4, maximum: 4, shared: true })
    const table = new WebAssembly.Table({ initial: 16, element: 'anyfunc' })
    const origTableGet = table.get.bind(table)
    const tableCallbacks = {
      1: () => {},
      2: (_env, status, data) => { completed.push([status, data]) }
    }
    Object.defineProperty(table, 'get', {
      configurable: true,
      value (index) {
        if (index in tableCallbacks) return tableCallbacks[index]
        return origTableGet(index)
      }
    })
    let nextAlloc = 2048
    const context = createContext({
      autoDestroy: false,
      features: { MessageChannel: undefined, setImmediate: (fn) => { queued.push(fn) } }
    })
    const addonModule = emnapiCore.createAddonModule({
      context,
      asyncWorkPoolSize: 1,
      reuseWorker: 0,
      onCreateWorker: () => worker,
      plugins: [asyncWorkPlugin]
    })
    // Wire a loaded worker in PThread.pthreads so initWorkers resolves without spawning
    const fakeTid = 55
    const fakePthreadPtr = 768
    new DataView(memory.buffer).setInt32(fakePthreadPtr + 20, fakeTid, true)
    worker.whenLoaded = Promise.resolve(worker)
    addonModule.PThread.pthreads[fakeTid] = worker
    addonModule.PThread.setup(mod, memory)
    const listenedWorker = addonModule.PThread.getNewWorker()
    assert.strictEqual(listenedWorker, worker)

    addonModule.init({
      instance: {
        exports: {
          ...rawInstance.exports,
          memory,
          __indirect_function_table: table,
          malloc (size) {
            const aligned = (Number(size) + 7) & ~7
            const ptr = nextAlloc
            nextAlloc += Math.max(aligned, 8)
            return ptr
          },
          free () {},
          emnapi_async_worker_create () { return fakePthreadPtr }
        }
      },
      module: mod,
      memory,
      table
    })
    const env = 64 + 8
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    const nameHandle = context.napiValueFromJsValue('awmt-test')

    // Pre-abort: cancelWork queues in pendingTasks and flush() delivers napi_cancelled once
    assert.strictEqual(addonModule.imports.napi.napi_create_async_work(env, 0, nameHandle, 1, 2, 66, 512), 0)
    const workCancelPre = dv.getUint32(512, true)
    assert.strictEqual(addonModule.imports.napi.napi_queue_async_work(env, workCancelPre), 0)
    assert.strictEqual(addonModule.imports.napi.napi_cancel_async_work(env, workCancelPre), 0)
    assert.strictEqual(context.hasPendingWork(), true)
    context.flush()
    assert.deepStrictEqual(completed, [[11 /* napi_cancelled */, 66]])
    assert.strictEqual(context.hasPendingWork(), false)
    for (const fn of queued.splice(0)) fn()
    assert.strictEqual(completed.length, 1)

    // Pre-abort: worker emitting async-work-complete runs complete callback
    assert.strictEqual(addonModule.imports.napi.napi_create_async_work(env, 0, nameHandle, 1, 2, 77, 520), 0)
    const work1 = dv.getUint32(520, true)
    worker.emit('message', { __emnapi__: { type: 'async-work-complete', payload: { work: work1 } } })
    assert.deepStrictEqual(completed, [[11, 66], [0, 77]])

    // Post-abort: queued cancelWork immediate AND worker async-work-complete are both no-ops
    assert.strictEqual(addonModule.imports.napi.napi_create_async_work(env, 0, nameHandle, 1, 2, 88, 528), 0)
    const workCancelPost = dv.getUint32(528, true)
    assert.strictEqual(addonModule.imports.napi.napi_queue_async_work(env, workCancelPost), 0)
    assert.strictEqual(addonModule.imports.napi.napi_cancel_async_work(env, workCancelPost), 0)
    assert.strictEqual(addonModule.imports.napi.napi_create_async_work(env, 0, nameHandle, 1, 2, 99, 536), 0)
    const work2 = dv.getUint32(536, true)

    context.abort()
    for (const fn of queued.splice(0)) fn()
    worker.emit('message', { __emnapi__: { type: 'async-work-complete', payload: { work: work2 } } })
    assert.deepStrictEqual(completed, [[11, 66], [0, 77]])
    context.closeScope(envObj, scope)
  }

  // 6. V8 plugin weak callbacks (_v8_make_weak and _node_buffer_new) post-abort gates
  {
    let weakCalls = 0
    let bufFreeCalls = 0
    const { context, addonModule } = setupInstrumentedAddon({
      createOptions: { plugins: [v8Plugin] },
      tableCallbacks: {
        1: () => { weakCalls++ },
        2: () => { bufFreeCalls++ }
      }
    })
    const scope = context.isolate.openScope()
    let v8RefId
    let bufPersistent
    try {
      const target = {}
      const handle = context.napiValueFromJsValue(target)
      v8RefId = addonModule.imports.env._v8_globalize_reference(0, handle)
      addonModule.imports.env._v8_make_weak(v8RefId, 123, 1, 456, 0)

      const beforeIds = new Set()
      for (let id = 1; id < 64; id++) {
        if (context.isolate.getRef(id)) beforeIds.add(id)
      }
      addonModule.imports.env._node_buffer_new(0, 256, 8, 2, 789)
      for (let id = 1; id < 64; id++) {
        if (!beforeIds.has(id) && context.isolate.getRef(id)) {
          bufPersistent = context.isolate.getRef(id)
          break
        }
      }
    } finally {
      context.isolate.closeScope(scope)
    }

    const v8Persistent = context.isolate.getRef(v8RefId)
    assert.ok(v8Persistent && typeof v8Persistent._callback === 'function')
    assert.ok(bufPersistent && typeof bufPersistent._callback === 'function')

    context.abort()
    v8Persistent._callback(v8Persistent._param)
    bufPersistent._callback(bufPersistent._param)
    assert.strictEqual(weakCalls, 0)
    assert.strictEqual(bufFreeCalls, 0)
  }

  // 7. Addon function created via napi_create_function and queued in a Promise
  //    must reject without re-entering Wasm after context.abort().
  {
    let wasmFnCalls = 0
    const { context, addonModule, memory, env } = setupInstrumentedAddon({
      tableCallbacks: {
        1: () => {
          wasmFnCalls++
          return 0
        }
      }
    })
    const envObj = context.getEnv(1)
    const scope = context.openScope(envObj)
    const dv = new DataView(memory.buffer)
    assert.strictEqual(addonModule.imports.napi.napi_create_function(env, 0, 0, 1, 0, 512), 0)
    const exportedFn = context.jsValueFromNapiValue(dv.getUint32(512, true))
    context.closeScope(envObj, scope)

    assert.strictEqual(typeof exportedFn, 'function')
    const queuedExportCall = Promise.resolve().then(() => exportedFn())
    context.abort()
    await assert.rejects(queuedExportCall, /Context has been aborted/)
    assert.strictEqual(wasmFnCalls, 0)
  }
}
