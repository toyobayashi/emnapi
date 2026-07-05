'use strict'

const assert = require('assert')
const { EventEmitter } = require('events')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')

const offsets32 = {
  __size__: 184,
  async_resource_resource: 0,
  async_resource_async_context_async_id: 8,
  async_resource_async_context_trigger_async_id: 16,
  queue_size: 60,
  async_resource_is_some: 24,
  queue: 64,
  async_pending: 132,
  async_u_fd: 96,
  thread_count: 136,
  state: 140,
  dispatch_state: 144,
  context: 148,
  max_queue_size: 152,
  ref: 156,
  env: 160,
  finalize_data: 164,
  finalize_cb: 168,
  call_js_cb: 172,
  handles_closing: 176,
  async_ref: 180,
  mutex: 32,
  cond: 56
}

const offsets64 = {
  __size__: 160,
  async_resource_resource: 0,
  async_resource_async_context_async_id: 8,
  async_resource_async_context_trigger_async_id: 16,
  queue_size: 24,
  async_resource_is_some: 32,
  queue: 40,
  async_pending: 48,
  async_u_fd: 56,
  thread_count: 64,
  state: 72,
  dispatch_state: 76,
  context: 80,
  max_queue_size: 88,
  ref: 96,
  env: 104,
  finalize_data: 112,
  finalize_cb: 120,
  call_js_cb: 128,
  handles_closing: 136,
  async_ref: 140,
  mutex: 144,
  cond: 152
}

function loadTSFN ({
  memory64 = false,
  wasmMemory,
  pthread = false,
  transport,
  context = {},
  immediate
}) {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/threadsafe-function.ts'
  )
  const { Compiler } = require('../../emnapi/script/preprocess.js')
  const source = new Compiler({
    defines: memory64 ? { MEMORY64: 1 } : {}
  }).parseFile(filename)
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText
  const shared = {
    emnapiCtx: context,
    emnapiNodeBinding: undefined,
    emnapiPostMessageTransport: transport
  }
  const testModule = { exports: {} }
  vm.runInNewContext(output, {
    module: testModule,
    exports: testModule.exports,
    require (id) {
      switch (id) {
        case 'emnapi:shared':
          return shared
        case 'emscripten:runtime':
          return {
            ENVIRONMENT_IS_NODE: true,
            ENVIRONMENT_IS_PTHREAD: pthread,
            PThread: undefined,
            _malloc () {},
            _free () {},
            abort () {},
            wasmMemory
          }
        case 'emscripten:parse-tools':
          return {
            POINTER_SIZE: memory64 ? 8 : 4,
            from64 () {},
            makeDynCall () {},
            to64 (value) {
              return memory64 ? BigInt(value) : Number(value)
            }
          }
        case './macro':
          return {
            $CHECK_ARG () {},
            $CHECK_ENV_NOT_IN_GC () {}
          }
        case './node':
          return {
            _emnapi_node_emit_async_destroy () {},
            _emnapi_node_emit_async_init () {}
          }
        case './util':
          return {
            _emnapi_runtime_keepalive_pop () {},
            _emnapi_runtime_keepalive_push () {}
          }
        default:
          throw new Error(`Unexpected test import: ${id}`)
      }
    },
    NapiTSFNOffset32: offsets32,
    NapiTSFNOffset64: offsets64,
    ReferenceOwnership: { kUserland: 0 },
    napi_status: {
      napi_ok: 0,
      napi_invalid_arg: 1,
      napi_generic_failure: 9,
      napi_closing: 16
    },
    napi_threadsafe_function_call_mode: {},
    napi_threadsafe_function_release_mode: {},
    setImmediate: immediate,
    Array,
    Atomics,
    BigInt,
    BigInt64Array,
    BigUint64Array,
    DataView,
    Int8Array,
    Int32Array,
    Map,
    Math,
    Promise,
    SharedArrayBuffer,
    Uint8Array,
    Uint32Array,
    WebAssembly,
    console
  }, { filename })
  const emnapiTSFN = testModule.exports.emnapiTSFN
  emnapiTSFN.init()
  return { emnapiTSFN, shared }
}

function testSignedWasm32Layout () {
  const buffer = new SharedArrayBuffer(0x80020000)
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: { buffer }
  })
  const address = -0x80000000
  const unsignedAddress = address >>> 0
  const bytes = new Uint8Array(
    buffer,
    unsignedAddress,
    emnapiTSFN.offset.__size__
  )

  bytes.fill(0xa5)
  emnapiTSFN.zeroMemory(address, emnapiTSFN.offset.__size__)
  assert.deepStrictEqual(
    Array.from(bytes),
    new Array(emnapiTSFN.offset.__size__).fill(0)
  )

  emnapiTSFN.addQueueSize(address)
  assert.strictEqual(emnapiTSFN.getQueueSize(address), 1)
  emnapiTSFN.addThreadCount(address)
  assert.strictEqual(emnapiTSFN.getThreadCount(address), 1)

  const mutex = emnapiTSFN.getMutex(address)
  mutex.lock()
  mutex.unlock()
  assert.strictEqual(
    new DataView(buffer).getInt32(
      unsignedAddress + emnapiTSFN.offset.mutex,
      true
    ),
    0
  )

  emnapiTSFN.getCond(address).signal()
  assert.strictEqual(
    new DataView(buffer).getInt32(
      unsignedAddress + emnapiTSFN.offset.cond,
      true
    ),
    1
  )

  emnapiTSFN.setState(address, 2)
  assert.strictEqual(emnapiTSFN.getState(address), 2)
  emnapiTSFN.setHandlesClosing(address, 1)
  assert.strictEqual(emnapiTSFN.getHandlesClosing(address), 1)

  const contextValue = 0x12345678
  emnapiTSFN.storeSizeTypeValue(
    address + emnapiTSFN.offset.context,
    contextValue,
    false
  )
  assert.strictEqual(emnapiTSFN.getContext(address), contextValue)

  new DataView(buffer).setFloat64(
    unsignedAddress + emnapiTSFN.offset.async_id,
    123.5,
    true
  )
  assert.strictEqual(
    emnapiTSFN.getFloat64(address + emnapiTSFN.offset.async_id),
    123.5
  )

  emnapiTSFN.setUint32(address + emnapiTSFN.offset.async_ref, 1)
  assert.strictEqual(
    new DataView(buffer).getUint32(
      unsignedAddress + emnapiTSFN.offset.async_ref,
      true
    ),
    1
  )

  const pendingAddress = unsignedAddress + emnapiTSFN.offset.async_pending
  Atomics.store(
    new Int32Array(buffer),
    Math.floor(pendingAddress / 4),
    1
  )
  const enqueued = []
  emnapiTSFN._liveSet.add(address)
  emnapiTSFN.enqueue = (func) => enqueued.push(func)
  emnapiTSFN.recoverAfterWorkerLoss()
  assert.strictEqual(
    Atomics.load(
      new Int32Array(buffer),
      Math.floor(pendingAddress / 4)
    ),
    2
  )
  assert.deepStrictEqual(enqueued, [address])
}

function testMemory64HighAddress () {
  const buffer = new SharedArrayBuffer(0x100020000)
  const { emnapiTSFN } = loadTSFN({
    memory64: true,
    wasmMemory: { buffer }
  })
  const address = 0x100001000
  const queueSizeAddress = address + emnapiTSFN.offset.queue_size
  const queueSizes = new BigUint64Array(buffer)
  const lowQueueSizeIndex = Math.floor(
    (queueSizeAddress % 0x100000000) / 8
  )
  queueSizes[lowQueueSizeIndex] = 11n

  emnapiTSFN.addQueueSize(address)
  assert.strictEqual(
    Atomics.load(queueSizes, Math.floor(queueSizeAddress / 8)),
    1n
  )
  assert.strictEqual(Atomics.load(queueSizes, lowQueueSizeIndex), 11n)

  const stateAddress = address + emnapiTSFN.offset.state
  const states = new Int32Array(buffer)
  const lowStateIndex = Math.floor(
    (stateAddress % 0x100000000) / 4
  )
  states[lowStateIndex] = 7
  emnapiTSFN.setState(address, 2)
  assert.strictEqual(
    Atomics.load(states, Math.floor(stateAddress / 4)),
    2
  )
  assert.strictEqual(Atomics.load(states, lowStateIndex), 7)
}

function testWasm32TopEndpoints () {
  const staleBuffer = new SharedArrayBuffer(64 * 1024)
  const currentBuffer = new SharedArrayBuffer(0x100000000)
  let stale = true
  let refreshes = 0
  const wasmMemory = {
    get buffer () {
      return stale ? staleBuffer : currentBuffer
    },
    grow (delta) {
      assert.strictEqual(delta, 0)
      refreshes++
      stale = false
      return 0
    }
  }
  const { emnapiTSFN } = loadTSFN({ wasmMemory })

  emnapiTSFN.setInt8(0xffffffff, 0x5a)
  assert.strictEqual(refreshes, 1)
  assert.strictEqual(
    new DataView(currentBuffer).getUint8(0xffffffff),
    0x5a
  )

  stale = true
  emnapiTSFN.setUint32(0xfffffffc, 0x12345678)
  assert.strictEqual(refreshes, 2)
  assert.strictEqual(
    new DataView(currentBuffer).getUint32(0xfffffffc, true),
    0x12345678
  )
}

function testTransportClassification () {
  const buffer = new SharedArrayBuffer(64 * 1024)
  let thenReads = 0
  let thenCalls = 0
  const thenable = {
    get then () {
      thenReads++
      return function (_resolve, reject) {
        thenCalls++
        assert.strictEqual(this, thenable)
        reject(new Error('unsupported async transport'))
      }
    }
  }
  const transport = {
    post: () => thenable,
    throwsAreDefinitelyNotDelivered: false
  }
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: { buffer },
    transport
  })

  assert.strictEqual(emnapiTSFN.postMessage({}), 2)
  assert.strictEqual(thenReads, 1)
  assert.strictEqual(thenCalls, 1)

  transport.post = () => Object.defineProperty({}, 'then', {
    get () {
      thenReads++
      throw new Error('then lookup failed')
    }
  })
  assert.strictEqual(emnapiTSFN.postMessage({}), 2)
  assert.strictEqual(thenReads, 2)

  const markerError = new Error('marker lookup failed')
  Object.defineProperty(markerError, 'emnapiNotDelivered', {
    get () {
      throw new Error('marker getter failed')
    }
  })
  transport.post = () => {
    throw markerError
  }
  assert.strictEqual(emnapiTSFN.postMessage({}), 2)

  transport.post = () => {
    const error = new Error('rejected before delivery')
    error.emnapiNotDelivered = true
    throw error
  }
  assert.strictEqual(emnapiTSFN.postMessage({}), 1)
}

function testWorkerLossAndChildScheduling () {
  const buffer = new SharedArrayBuffer(64 * 1024)
  const scheduled = []
  let postCount = 0
  const transport = {
    post () {
      postCount++
      return postCount === 1
        ? Object.defineProperty({}, 'then', {
          get () {
            throw new Error('ambiguous acceptance')
          }
        })
        : undefined
    },
    throwsAreDefinitelyNotDelivered: false
  }
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: { buffer },
    pthread: true,
    transport,
    immediate: (callback) => scheduled.push(callback)
  })
  let callbackRan = false
  emnapiTSFN.schedule(() => {
    callbackRan = true
  })
  assert.strictEqual(scheduled.length, 1)
  scheduled.shift()()
  assert.strictEqual(callbackRan, true)

  emnapiTSFN.offset.dispatch_state = 128
  emnapiTSFN.offset.async_pending = 132
  const childAddress = 1024
  assert.strictEqual(emnapiTSFN.send(childAddress), 0)
  assert.strictEqual(postCount, 1)
  assert.strictEqual(scheduled.length, 1)
  scheduled.shift()()
  assert.strictEqual(postCount, 2)
  assert.strictEqual(emnapiTSFN._sendRetryMap.size, 0)

  const creator = loadTSFN({
    wasmMemory: { buffer }
  }).emnapiTSFN
  creator.offset.async_pending = 256
  const address = 1024
  const pending = address + creator.offset.async_pending
  const pendingArray = new Int32Array(buffer)
  const pendingIndex = Math.floor(pending / 4)
  const enqueued = []
  creator._liveSet.add(address)
  creator.enqueue = (func) => enqueued.push(func)

  let terminated = false
  const worker = new EventEmitter()
  worker.terminate = () => {
    terminated = true
  }
  creator.addListener(worker)

  Atomics.store(pendingArray, pendingIndex, 1)
  worker.emit('exit')
  assert.strictEqual(Atomics.load(pendingArray, pendingIndex), 2)
  assert.deepStrictEqual(enqueued, [address])
  assert.strictEqual(worker._emnapiTSFNListener, undefined)

  const terminatingWorker = new EventEmitter()
  terminatingWorker.terminate = () => {
    terminated = true
  }
  creator.addListener(terminatingWorker)
  Atomics.store(pendingArray, pendingIndex, 1)
  terminatingWorker.terminate()
  assert.strictEqual(terminated, true)
  assert.strictEqual(Atomics.load(pendingArray, pendingIndex), 2)
  assert.deepStrictEqual(enqueued, [address, address, address])
  terminatingWorker._emnapiTSFNListener.dispose()
}

module.exports = Promise.resolve().then(() => {
  testSignedWasm32Layout()
  testMemory64HighAddress()
  testWasm32TopEndpoints()
  testTransportClassification()
  testWorkerLossAndChildScheduling()
})
