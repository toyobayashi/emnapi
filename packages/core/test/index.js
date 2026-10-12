import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { getDefaultContext } from '@emnapi/runtime'
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
