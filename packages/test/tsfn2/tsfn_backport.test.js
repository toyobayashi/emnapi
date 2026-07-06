'use strict'

const assert = require('assert')
const { EventEmitter } = require('events')
const fs = require('fs')
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

function transpile (filename, memory64 = false) {
  const { Compiler } = require('../../emnapi/script/preprocess.js')
  const source = new Compiler({
    defines: memory64 ? { MEMORY64: 1 } : {}
  }).parseFile(filename)
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText
}

function loadMemoryView (memory64 = false) {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/memory-view.ts'
  )
  const testModule = { exports: {} }
  vm.runInNewContext(transpile(filename, memory64), {
    module: testModule,
    exports: testModule.exports,
    ArrayBuffer,
    BigInt,
    DataView,
    Object,
    SharedArrayBuffer,
    Uint8Array,
    WeakMap,
    WebAssembly
  }, { filename })
  return testModule.exports.emnapiMemory
}

function loadGeneratedEmscriptenMemory (memory64 = false) {
  const filename = path.join(
    __dirname,
    '../../emnapi/dist/library_napi.js'
  )
  const source = fs.readFileSync(filename, 'utf8')
  const start = source.indexOf('var emnapiMemory = {')
  assert.notStrictEqual(start, -1)
  const end = source.indexOf('\n};', start)
  assert.notStrictEqual(end, -1)
  const objectSource = source.slice(start, end + 3)
    .replace(/^(\s*)#(if|else|endif)/gm, '$1// #$2')
  const { Compiler } = require('../../emnapi/script/preprocess.js')
  const compiled = new Compiler({
    defines: memory64 ? { MEMORY64: 1 } : {}
  }).parseCode(objectSource)
  const calls = []
  const testModule = { exports: {} }
  vm.runInNewContext(`${compiled}\nmodule.exports = emnapiMemory`, {
    module: testModule,
    getDataView (_memory, end) {
      return {
        setInt32 (address, value, littleEndian) {
          calls.push({ end, address, value, littleEndian })
        }
      }
    }
  }, { filename })
  return {
    emnapiMemory: testModule.exports,
    calls
  }
}

function loadCoreInit (options, globalPostMessage) {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/core/init.ts'
  )
  const testModule = { exports: {} }
  const sandbox = {
    module: testModule,
    exports: testModule.exports,
    options,
    postMessage: globalPostMessage,
    process,
    Promise,
    WebAssembly,
    console,
    require (id) {
      if (id === 'emscripten:parse-tools') {
        return {
          makeDynCall () {
            return () => {}
          },
          to64 (value) {
            return Number(value)
          }
        }
      }
      throw new Error(`Unexpected module: ${id}`)
    },
    ThreadManager: class ThreadManager {
      constructor (threadOptions) {
        this.options = threadOptions
      }
    }
  }
  const context = vm.createContext(sandbox)
  vm.runInContext('this.__globalThis = globalThis', context)
  vm.runInContext(transpile(filename), context, { filename })
  return {
    exports: testModule.exports,
    globalThis: sandbox.__globalThis
  }
}

function loadTSFN ({
  memory64 = false,
  wasmMemory,
  pthread = false,
  transport,
  context,
  immediate,
  timeout,
  pThread,
  malloc = () => 0,
  free = () => {},
  dynCall
}) {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/threadsafe-function.ts'
  )
  const cleanupHooks = []
  const feature = {}
  if (immediate) feature.setImmediate = immediate
  if (timeout) feature.setTimeout = timeout
  const defaultContext = {
    feature,
    addCleanupHook (envObject, hook, arg) {
      cleanupHooks.push({ envObject, hook, arg })
    },
    removeCleanupHook (envObject, hook, arg) {
      const index = cleanupHooks.findIndex(item => (
        item.envObject === envObject &&
        item.hook === hook &&
        item.arg === arg
      ))
      if (index !== -1) cleanupHooks.splice(index, 1)
    },
    envStore: new Map(),
    refStore: new Map(),
    handleStore: new Map(),
    openScope () {},
    closeScope () {},
    decreaseWaitingRequestCounter () {}
  }
  const emnapiCtx = Object.assign(defaultContext, context)
  if (context?.feature) emnapiCtx.feature = context.feature
  const shared = {
    emnapiCtx,
    emnapiNodeBinding: undefined,
    emnapiPostMessageTransport: transport
  }
  const testModule = { exports: {} }
  vm.runInNewContext(transpile(filename, memory64), {
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
            PThread: pThread,
            _malloc: malloc,
            _free: free,
            abort () {},
            wasmMemory
          }
        case 'emscripten:parse-tools':
          return {
            POINTER_SIZE: memory64 ? 8 : 4,
            from64 () {},
            makeDynCall (signature, name) {
              return (...args) => dynCall?.(signature, name, args)
            },
            to64 (value) {
              return memory64 ? BigInt(value) : Number(value)
            }
          }
        case './macro':
          return {
            $CHECK_ARG () {},
            $CHECK_ENV_NOT_IN_GC (env) {
              return emnapiCtx.envStore.get(env)
            }
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
        case './memory-view':
          return {
            emnapiMemory: loadMemoryView(memory64)
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
      napi_queue_full: 15,
      napi_closing: 16,
      napi_would_deadlock: 21
    },
    napi_threadsafe_function_call_mode: {
      napi_tsfn_nonblocking: 0
    },
    napi_threadsafe_function_release_mode: {
      napi_tsfn_release: 0,
      napi_tsfn_abort: 1
    },
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
    Number,
    Object,
    Promise,
    SharedArrayBuffer,
    Uint8Array,
    Uint32Array,
    WebAssembly,
    console
  }, { filename })
  const emnapiTSFN = testModule.exports.emnapiTSFN
  emnapiTSFN.init()
  return {
    cleanupHooks,
    emnapiCtx,
    emnapiTSFN,
    exports: testModule.exports,
    shared
  }
}

function loadEmscriptenAsync (dynCalls) {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/emscripten/async.ts'
  )
  const testModule = { exports: {} }
  vm.runInNewContext(transpile(filename), {
    module: testModule,
    exports: testModule.exports,
    require (id) {
      switch (id) {
        case 'emscripten:runtime':
          return {
            ENVIRONMENT_IS_NODE: true,
            ENVIRONMENT_IS_PTHREAD: false,
            PThread: { pthreads: {} }
          }
        case 'emscripten:parse-tools':
          return {
            makeDynCall () {
              return data => dynCalls.push(data)
            }
          }
        case '../util':
          return {
            _emnapi_next_tick () {},
            _emnapi_set_immediate () {}
          }
        default:
          throw new Error(`Unexpected async test import: ${id}`)
      }
    },
    Number,
    postMessage () {}
  }, { filename })
  return testModule.exports
}

function loadCoreAsyncWork () {
  const filename = path.join(
    __dirname,
    '../../emnapi/src/core/async-work.ts'
  )
  const testModule = { exports: {} }
  const napiModule = { childThread: false }
  const source = `${transpile(filename)}
module.exports.__emnapiAWMT = emnapiAWMT
`
  vm.runInNewContext(source, {
    module: testModule,
    exports: testModule.exports,
    require (id) {
      switch (id) {
        case 'emnapi:shared':
          return {
            _emnapi_async_work_pool_size () {
              return 0
            },
            emnapiCtx: {},
            emnapiNodeBinding: undefined,
            emnapiPostMessage () {},
            napiModule,
            onCreateWorker () {},
            singleThreadAsyncWork: false
          }
        case 'emscripten:runtime':
          return {
            ENVIRONMENT_IS_NODE: true,
            ENVIRONMENT_IS_PTHREAD: false,
            PThread: undefined,
            _free () {},
            _malloc () {
              return 0
            },
            abort () {},
            wasmInstance: { exports: {} },
            wasmMemory: new WebAssembly.Memory({
              initial: 1,
              maximum: 2,
              shared: true
            })
          }
        case 'emscripten:parse-tools':
          return {
            POINTER_SIZE: 4,
            from64 () {},
            makeDynCall () {
              return () => {}
            },
            makeGetValue () {
              return 0
            },
            makeSetValue () {},
            to64 (value) {
              return Number(value)
            }
          }
        case '../async-work':
          return { emnapiAWST: {} }
        case '../macro':
          return {
            $CHECK_ARG () {},
            $CHECK_ENV () {},
            $CHECK_ENV_NOT_IN_GC () {}
          }
        case '../node':
          return {
            _emnapi_node_emit_async_destroy () {},
            _emnapi_node_emit_async_init () {}
          }
        case '../threadsafe-function':
          return {
            emnapiTSFN: {
              addListener () {}
            }
          }
        case '../util':
          return {
            _emnapi_runtime_keepalive_pop () {},
            _emnapi_runtime_keepalive_push () {}
          }
        case '../memory-view':
          return {
            emnapiMemory: loadMemoryView()
          }
        default:
          throw new Error(`Unexpected async-work test import: ${id}`)
      }
    },
    Array,
    Atomics,
    BigInt,
    Int32Array,
    Map,
    Number,
    Object,
    Promise,
    SharedArrayBuffer,
    Uint8Array,
    WebAssembly,
    napi_status: {
      napi_ok: 0
    }
  }, { filename })
  return testModule.exports.__emnapiAWMT
}

function allocation (emnapiTSFN, address) {
  emnapiTSFN.zeroMemory(address, emnapiTSFN.offset.__size__)
  return {
    address,
    generation: emnapiTSFN.register(address)
  }
}

function getPending (emnapiTSFN, memory, address) {
  return Atomics.load(
    new Int32Array(memory.buffer),
    Math.floor((address + emnapiTSFN.offset.async_pending) / 4)
  )
}

function setPending (emnapiTSFN, memory, address, value) {
  Atomics.store(
    new Int32Array(memory.buffer),
    Math.floor((address + emnapiTSFN.offset.async_pending) / 4),
    value
  )
}

async function flushMicrotasks (turns = 4) {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

function testMemoryRefresh () {
  const emnapiMemory = loadMemoryView()
  const sharedMemory = new WebAssembly.Memory({
    initial: 1,
    maximum: 3,
    shared: true
  })
  const staleBuffer = sharedMemory.buffer
  sharedMemory.grow(1)
  const currentBuffer = sharedMemory.buffer
  let refreshes = 0
  let stale = true
  const staleSharedMemory = {
    get buffer () {
      return stale ? staleBuffer : currentBuffer
    },
    grow (delta) {
      assert.strictEqual(delta, 0)
      refreshes++
      stale = false
      return 2
    }
  }

  assert.strictEqual(
    emnapiMemory.ensureBufferFor(
      staleSharedMemory,
      staleBuffer.byteLength + 1
    ),
    currentBuffer
  )
  assert.strictEqual(refreshes, 1)
  assert.strictEqual(
    emnapiMemory.getDataView(
      staleSharedMemory,
      staleBuffer.byteLength + 1
    ).buffer,
    currentBuffer
  )
  stale = true
  emnapiMemory.setUint32(
    staleSharedMemory,
    staleBuffer.byteLength,
    0x12345678
  )
  assert.strictEqual(refreshes, 2)
  assert.strictEqual(
    new DataView(currentBuffer).getUint32(staleBuffer.byteLength, true),
    0x12345678
  )

  const unsharedMemory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2
  })
  const unsharedBuffer = unsharedMemory.buffer
  let unsharedGrowCalls = 0
  const guardedUnsharedMemory = {
    get buffer () {
      return unsharedBuffer
    },
    grow () {
      unsharedGrowCalls++
      throw new Error('unshared memory must not refresh with grow(0)')
    }
  }
  assert.throws(
    () => emnapiMemory.setUint32(
      guardedUnsharedMemory,
      unsharedBuffer.byteLength,
      1
    ),
    RangeError
  )
  assert.strictEqual(unsharedGrowCalls, 0)
  assert.strictEqual(unsharedBuffer.byteLength, 64 * 1024)
}

function testSignedWasm32TopEndpoints () {
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

  emnapiTSFN.setInt8(-1, 0x5a)
  assert.strictEqual(refreshes, 1)
  assert.strictEqual(
    new DataView(currentBuffer).getUint8(0xffffffff),
    0x5a
  )

  stale = true
  emnapiTSFN.setUint32(-4, 0x12345678)
  assert.strictEqual(refreshes, 2)
  assert.strictEqual(
    new DataView(currentBuffer).getUint32(0xfffffffc, true),
    0x12345678
  )
}

async function testTransportThenableDeferral () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  let thenReads = 0
  let thenCalls = 0
  const result = {
    get then () {
      thenReads++
      return function (resolve) {
        thenCalls++
        assert.strictEqual(this, result)
        resolve()
      }
    }
  }
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: memory,
    transport: {
      post: () => result,
      throwsAreDefinitelyNotDelivered: false
    }
  })

  assert.strictEqual(emnapiTSFN.postMessage({}), 2)
  assert.strictEqual(thenReads, 0)
  assert.strictEqual(thenCalls, 0)
  await flushMicrotasks()
  assert.strictEqual(thenReads, 1)
  assert.strictEqual(thenCalls, 1)
}

function testGeneratedMemoryAddressNormalization () {
  const wasm32 = loadGeneratedEmscriptenMemory()
  wasm32.emnapiMemory.setInt32({}, -4, 0x12345678)
  assert.deepStrictEqual(wasm32.calls, [{
    end: 0x100000000,
    address: 0xfffffffc,
    value: 0x12345678,
    littleEndian: true
  }])

  const wasm64 = loadGeneratedEmscriptenMemory(true)
  wasm64.emnapiMemory.setInt32({}, 0x100000000, 0x12345678)
  assert.deepStrictEqual(wasm64.calls, [{
    end: 0x100000004,
    address: 0x100000000,
    value: 0x12345678,
    littleEndian: true
  }])
}

function testConfiguredGlobalTransportClassification () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const messages = []
  const receivers = []
  let markNotDelivered = false
  function postMessage (message) {
    messages.push(message)
    receivers.push(this)
    const error = new Error('transport failed after enqueue')
    if (markNotDelivered) {
      error.emnapiNotDelivered = true
    }
    throw error
  }

  const configured = loadCoreInit({
    childThread: true,
    postMessage
  }, postMessage)
  const configuredTransport =
    configured.exports.emnapiPostMessageTransport
  assert.notStrictEqual(
    configured.exports.napiModule.postMessage,
    postMessage
  )
  assert.strictEqual(
    configuredTransport.throwsAreDefinitelyNotDelivered,
    false
  )
  const configuredTSFN = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport: configuredTransport
  }).emnapiTSFN
  assert.strictEqual(configuredTSFN.postMessage({ configured: true }), 2)
  assert.strictEqual(receivers.pop(), configured.globalThis)

  markNotDelivered = true
  assert.strictEqual(configuredTSFN.postMessage({ marked: true }), 1)
  assert.strictEqual(receivers.pop(), configured.globalThis)

  markNotDelivered = false
  const detected = loadCoreInit({
    childThread: true
  }, postMessage)
  const detectedTransport = detected.exports.emnapiPostMessageTransport
  assert.strictEqual(
    detectedTransport.throwsAreDefinitelyNotDelivered,
    true
  )
  const detectedTSFN = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport: detectedTransport
  }).emnapiTSFN
  assert.strictEqual(detectedTSFN.postMessage({ detected: true }), 1)
  assert.strictEqual(receivers.pop(), detected.globalThis)
  assert.deepStrictEqual(messages, [
    { configured: true },
    { marked: true },
    { detected: true }
  ])
}

function testGenerationTransportAndAccessors () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const { emnapiTSFN } = loadTSFN({ wasmMemory: memory })
  const address = 768
  const { generation } = allocation(emnapiTSFN, address)
  const enqueued = []
  emnapiTSFN.enqueue = (func, currentGeneration) => {
    enqueued.push([func, currentGeneration])
  }
  const worker = new EventEmitter()
  worker.terminate = () => {}
  emnapiTSFN.addListener(worker)

  const message = emnapiTSFN.createMessage(
    'tsfn-send',
    address,
    generation
  )
  assert.strictEqual(
    message.__emnapi__.payload.generation,
    generation.toString()
  )
  worker.emit('message', JSON.parse(JSON.stringify(message)))
  assert.deepStrictEqual(enqueued, [[address, generation]])

  for (const invalidGeneration of ['01', '-0', '1.0', 'x', {}, 1]) {
    worker.emit('message', {
      __emnapi__: {
        type: 'tsfn-send',
        payload: {
          tsfn: address,
          generation: invalidGeneration
        }
      }
    })
  }
  assert.deepStrictEqual(enqueued, [[address, generation]])

  const observed = new Int32Array(new SharedArrayBuffer(4))
  worker.emit('message', {
    __emnapi__: {
      type: 'invalid',
      payload: { observed }
    }
  })
  assert.strictEqual(Atomics.load(observed, 0), 1)
  worker._emnapiTSFNListener.dispose()

  let postGetterReads = 0
  const throwingPostTransport = {}
  Object.defineProperty(throwingPostTransport, 'post', {
    get () {
      postGetterReads++
      throw new Error('post getter failed')
    }
  })
  const getterTSFN = loadTSFN({
    wasmMemory: memory,
    transport: throwingPostTransport
  }).emnapiTSFN
  assert.strictEqual(getterTSFN.postMessage({}), 2)
  assert.strictEqual(postGetterReads, 1)

  let deliveryGetterReads = 0
  const throwingDeliveryTransport = {
    post () {
      throw new Error('post failed')
    }
  }
  Object.defineProperty(
    throwingDeliveryTransport,
    'throwsAreDefinitelyNotDelivered',
    {
      get () {
        deliveryGetterReads++
        throw new Error('delivery getter failed')
      }
    }
  )
  const deliveryTSFN = loadTSFN({
    wasmMemory: memory,
    transport: throwingDeliveryTransport
  }).emnapiTSFN
  assert.strictEqual(deliveryTSFN.postMessage({}), 2)
  assert.strictEqual(deliveryGetterReads, 1)
}

function testWorkerMessageValidation () {
  const asyncCalls = []
  const { $emnapiAddSendListener } = loadEmscriptenAsync(asyncCalls)
  const sendWorker = new EventEmitter()
  $emnapiAddSendListener(sendWorker)
  assert.doesNotThrow(() => {
    sendWorker.emit('message', null)
    sendWorker.emit('message', undefined)
    sendWorker.emit('message', {
      __emnapi__: {
        type: 'async-send',
        payload: {}
      }
    })
    sendWorker.emit('message', {
      __emnapi__: {
        type: 'async-send',
        payload: { callback: -1, data: 1 }
      }
    })
    sendWorker.emit('message', {
      __emnapi__: {
        type: 'async-send',
        payload: { callback: 1.5, data: 1 }
      }
    })
    sendWorker.emit('message', {
      __emnapi__: {
        type: 'async-send',
        payload: { callback: 1, data: {} }
      }
    })
  })
  assert.deepStrictEqual(asyncCalls, [])
  sendWorker.emit('message', {
    __emnapi__: {
      type: 'async-send',
      payload: { callback: 1, data: 123 }
    }
  })
  sendWorker.emit('message', {
    __emnapi__: {
      type: 'async-send',
      payload: { callback: 2, data: 456n }
    }
  })
  assert.deepStrictEqual(asyncCalls, [123, 456n])
  sendWorker._emnapiSendListener.dispose()

  const emnapiAWMT = loadCoreAsyncWork()
  const completions = []
  emnapiAWMT.callComplete = (work, status) => {
    completions.push([work, status])
  }
  const workWorker = new EventEmitter()
  emnapiAWMT.addListener(workWorker)
  assert.doesNotThrow(() => {
    workWorker.emit('message', null)
    workWorker.emit('message', {
      __emnapi__: {
        type: 'async-work-complete',
        payload: {}
      }
    })
    workWorker.emit('message', {
      __emnapi__: {
        type: 'async-work-complete',
        payload: { work: 0 }
      }
    })
    workWorker.emit('message', {
      __emnapi__: {
        type: 'async-work-complete',
        payload: { work: 1.5 }
      }
    })
  })
  assert.deepStrictEqual(completions, [])
  workWorker.emit('message', {
    __emnapi__: {
      type: 'async-work-complete',
      payload: { work: 64 }
    }
  })
  assert.deepStrictEqual(completions, [[64, 0]])
  workWorker._emnapiAWMTListener.dispose()
}

function testStaleGenerationGuards () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const scheduled = []
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: memory,
    immediate: callback => scheduled.push(callback)
  })
  const address = 1024
  const oldAllocation = allocation(emnapiTSFN, address)
  const dispatches = []
  emnapiTSFN.dispatch = (func, generation) => {
    dispatches.push([func, generation])
  }
  setPending(emnapiTSFN, memory, address, 2)
  emnapiTSFN.enqueue(address, oldAllocation.generation)
  assert.strictEqual(scheduled.length, 1)

  emnapiTSFN.unregister(address, oldAllocation.generation)
  const replacement = allocation(emnapiTSFN, address)
  scheduled.shift()()
  assert.deepStrictEqual(dispatches, [])
  assert.strictEqual(
    emnapiTSFN.getGeneration(address),
    replacement.generation
  )

  const destroyed = []
  emnapiTSFN.destroyRetired = (func, generation) => {
    destroyed.push([func, generation])
  }
  const worker = new EventEmitter()
  worker.terminate = () => {}
  emnapiTSFN.addListener(worker)
  const sendObserved = new Int32Array(new SharedArrayBuffer(4))
  const destroyObserved = new Int32Array(new SharedArrayBuffer(4))
  worker.emit('message', emnapiTSFN.createMessage(
    'tsfn-send',
    address,
    oldAllocation.generation,
    sendObserved
  ))
  worker.emit('message', emnapiTSFN.createMessage(
    'tsfn-destroy',
    address,
    oldAllocation.generation,
    destroyObserved
  ))
  assert.strictEqual(Atomics.load(sendObserved, 0), 1)
  assert.strictEqual(Atomics.load(destroyObserved, 0), 1)
  assert.deepStrictEqual(dispatches, [])
  assert.deepStrictEqual(destroyed, [])

  const fakeEnv = {}
  emnapiTSFN.addCleanup(address, replacement.generation, fakeEnv)
  const staleHook = emnapiTSFN._cleanupMap.get(address).hook
  emnapiTSFN.unregister(address, replacement.generation)
  const next = allocation(emnapiTSFN, address)
  emnapiTSFN.addCleanup(address, next.generation, fakeEnv)
  staleHook(address)
  assert.strictEqual(
    emnapiTSFN._cleanupMap.get(address).generation,
    next.generation
  )
  assert.strictEqual(emnapiTSFN.getGeneration(address), next.generation)
  worker._emnapiTSFNListener.dispose()
}

function testCreatorSideWakeupPromotion () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const { emnapiTSFN } = loadTSFN({ wasmMemory: memory })
  const address = 2048
  const { generation } = allocation(emnapiTSFN, address)
  const enqueued = []
  emnapiTSFN.enqueue = (func, currentGeneration) => {
    enqueued.push([func, currentGeneration])
  }

  setPending(emnapiTSFN, memory, address, 1)
  assert.strictEqual(emnapiTSFN.send(address, generation), 0)
  assert.strictEqual(getPending(emnapiTSFN, memory, address), 2)
  assert.deepStrictEqual(enqueued, [[address, generation]])
}

function testDefiniteFailureAfterDelivery () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const scheduled = []
  const creator = loadTSFN({
    wasmMemory: memory,
    immediate: callback => scheduled.push(callback)
  }).emnapiTSFN
  const address = 3072
  const { generation } = allocation(creator, address)
  const worker = new EventEmitter()
  worker.terminate = () => {}
  creator.addListener(worker)

  const child = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport: {
      post (message) {
        worker.emit('message', message)
        const error = new Error('reported pre-delivery after enqueue')
        error.emnapiNotDelivered = true
        throw error
      },
      throwsAreDefinitelyNotDelivered: false
    }
  }).emnapiTSFN

  assert.strictEqual(child.send(address, generation), 0)
  assert.strictEqual(getPending(child, memory, address), 2)
  assert.strictEqual(scheduled.length, 1)
  worker._emnapiTSFNListener.dispose()
}

function testRetryOwnershipAndRetiredMemory () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const scheduled = []
  const transport = {
    post () {
      throw new Error('ambiguous delivery')
    },
    throwsAreDefinitelyNotDelivered: false
  }
  const child = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport,
    immediate: callback => scheduled.push(callback)
  }).emnapiTSFN
  const address = 4096
  const { generation } = allocation(child, address)

  assert.strictEqual(child.send(address, generation), 0)
  const sendRetry = child._sendRetryMap.get(address)
  assert.ok(sendRetry)
  assert.strictEqual(Atomics.load(sendRetry.observed, 0), 0)

  transport.post = () => undefined
  assert.strictEqual(child.retire(address, generation), true)
  assert.strictEqual(child._sendRetryMap.has(address), false)
  assert.strictEqual(Atomics.load(sendRetry.observed, 0), 1)
  child.getGeneration = () => {
    throw new Error('send retry read retired TSFN memory')
  }
  assert.doesNotThrow(() => {
    while (scheduled.length) scheduled.shift()()
  })

  const destroyScheduled = []
  let destroyObserved
  const destroyChild = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport: {
      post (message) {
        destroyObserved = message.__emnapi__.payload.observed
        throw new Error('ambiguous destroy delivery')
      },
      throwsAreDefinitelyNotDelivered: false
    },
    immediate: callback => destroyScheduled.push(callback)
  }).emnapiTSFN
  const destroyAddress = 5120
  const destroyAllocation = allocation(destroyChild, destroyAddress)
  assert.strictEqual(
    destroyChild.retire(
      destroyAddress,
      destroyAllocation.generation
    ),
    true
  )
  assert.ok(destroyObserved instanceof Int32Array)
  Atomics.store(destroyObserved, 0, 1)
  destroyChild.getGeneration = () => {
    throw new Error('destroy retry read retired TSFN memory')
  }
  assert.doesNotThrow(() => destroyScheduled.shift()())
  assert.strictEqual(destroyChild._destroyRetryMap.has(destroyAddress), false)
}

function testCreatorReclamationAndWorkerLoss () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const creator = loadTSFN({ wasmMemory: memory }).emnapiTSFN
  const address = 6144
  const { generation } = allocation(creator, address)
  const messages = []
  const child = loadTSFN({
    wasmMemory: memory,
    pthread: true,
    transport: {
      post (message) {
        messages.push(message)
      },
      throwsAreDefinitelyNotDelivered: false
    }
  }).emnapiTSFN
  assert.strictEqual(child.retire(address, generation), true)
  assert.strictEqual(creator.getGeneration(address), 0n)
  assert.strictEqual(messages.length, 1)

  const destroyed = []
  creator.destroyRetired = (func, retiredGeneration) => {
    destroyed.push([func, retiredGeneration])
  }
  const worker = new EventEmitter()
  const originalTerminate = () => {}
  worker.terminate = originalTerminate
  creator.addListener(worker)
  worker.emit('message', messages.shift())
  assert.deepStrictEqual(destroyed, [[address, generation]])
  assert.strictEqual(creator._liveMap.has(address), false)
  worker._emnapiTSFNListener.dispose()

  const lossCreator = loadTSFN({ wasmMemory: memory }).emnapiTSFN
  const lossAddress = 7168
  const lossAllocation = allocation(lossCreator, lossAddress)
  const lossDestroyed = []
  lossCreator.destroyRetired = (func, retiredGeneration) => {
    lossDestroyed.push([func, retiredGeneration])
  }
  lossCreator.setGeneration(lossAddress, 0n)
  const lossWorker = new EventEmitter()
  const lossTerminate = () => {}
  lossWorker.terminate = lossTerminate
  lossCreator.addListener(lossWorker)
  lossWorker.emit('exit', 1)
  assert.deepStrictEqual(lossDestroyed, [[
    lossAddress,
    lossAllocation.generation
  ]])
  assert.strictEqual(lossWorker._emnapiTSFNListener, undefined)
  assert.strictEqual(lossWorker._emnapiTSFNTerminate, undefined)
  assert.strictEqual(lossWorker.terminate, lossTerminate)
  assert.strictEqual(lossWorker.listenerCount('message'), 0)
  assert.strictEqual(lossWorker.listenerCount('exit'), 0)
}

function testWorkerRecoveryIsolation () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const { emnapiTSFN } = loadTSFN({ wasmMemory: memory })
  let terminateCalls = 0
  const worker = new EventEmitter()
  worker.terminate = () => {
    terminateCalls++
  }
  emnapiTSFN.recoverAfterWorkerLoss = () => {
    throw new Error('recovery failed')
  }
  emnapiTSFN.startReclaimSweep = () => {
    throw new Error('sweep failed')
  }
  emnapiTSFN.addListener(worker)
  assert.doesNotThrow(() => worker.terminate())
  assert.strictEqual(terminateCalls, 1)
  assert.doesNotThrow(() => worker.emit('exit', 1))
  assert.strictEqual(worker._emnapiTSFNListener, undefined)
  assert.strictEqual(worker._emnapiTSFNTerminate, undefined)
}

async function testSchedulerHardening () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })

  for (const scheduler of [
    callback => {
      callback()
      throw new Error('callback then throw')
    },
    () => {
      throw new Error('throw before callback')
    },
    callback => {
      callback()
      callback()
    }
  ]) {
    let calls = 0
    const { emnapiTSFN } = loadTSFN({
      wasmMemory: memory,
      immediate: scheduler
    })
    assert.doesNotThrow(() => {
      emnapiTSFN.schedule(() => {
        calls++
      })
    })
    assert.strictEqual(calls, 0)
    await flushMicrotasks()
    assert.strictEqual(calls, 1)
  }

  let getterCalls = 0
  const throwingFeature = {}
  Object.defineProperty(throwingFeature, 'setImmediate', {
    get () {
      getterCalls++
      throw new Error('scheduler getter failed')
    }
  })
  let getterScheduled = 0
  const getterTSFN = loadTSFN({
    wasmMemory: memory,
    context: { feature: throwingFeature }
  }).emnapiTSFN
  assert.doesNotThrow(() => {
    getterTSFN.schedule(() => {
      getterScheduled++
    })
  })
  await flushMicrotasks()
  assert.strictEqual(getterCalls, 1)
  assert.strictEqual(getterScheduled, 1)

  let rejectedSchedulerCalls = 0
  const rejectedScheduler = loadTSFN({
    wasmMemory: memory,
    immediate: () => ({
      then (_resolve, reject) {
        reject(new Error('async scheduler rejection'))
      }
    })
  }).emnapiTSFN
  rejectedScheduler.schedule(() => {
    rejectedSchedulerCalls++
  })
  await flushMicrotasks(8)
  assert.strictEqual(rejectedSchedulerCalls, 1)

  const queued = []
  let timerCalls = 0
  const timerTSFN = loadTSFN({
    wasmMemory: memory,
    immediate: callback => queued.push(callback),
    timeout: callback => {
      callback()
      return {
        unref () {
          throw new Error('unref failed')
        }
      }
    }
  }).emnapiTSFN
  assert.doesNotThrow(() => {
    timerTSFN.scheduleRetry(() => {
      timerCalls++
    }, 3)
  })
  assert.strictEqual(timerCalls, 0)
  assert.strictEqual(queued.length, 1)
  queued.shift()()
  assert.strictEqual(timerCalls, 1)

  let rejectedTimerCalls = 0
  const rejectedTimer = loadTSFN({
    wasmMemory: memory,
    timeout: () => ({
      then (_resolve, reject) {
        reject(new Error('async timer rejection'))
      },
      unref () {}
    })
  }).emnapiTSFN
  rejectedTimer.scheduleRetry(() => {
    rejectedTimerCalls++
  }, 3)
  await flushMicrotasks(8)
  assert.strictEqual(rejectedTimerCalls, 1)
}

function testFinalizeCleanupAfterError () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const expected = new Error('queue cleanup failed')
  const fakeEnv = {}
  let closeScopeCalls = 0
  let maybeDeleteCalls = 0
  const context = {
    envStore: new Map([[1, fakeEnv]]),
    openScope () {},
    closeScope () {
      closeScopeCalls++
    }
  }
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: memory,
    context
  })
  const address = 8192
  const { generation } = allocation(emnapiTSFN, address)
  emnapiTSFN.getEnv = () => 1
  emnapiTSFN.emptyQueue = () => {
    throw expected
  }
  emnapiTSFN.maybeDelete = (func, currentGeneration) => {
    assert.strictEqual(func, address)
    assert.strictEqual(currentGeneration, generation)
    maybeDeleteCalls++
  }

  assert.throws(
    () => emnapiTSFN.finalize(address, generation),
    error => error === expected
  )
  assert.strictEqual(maybeDeleteCalls, 1)
  assert.strictEqual(closeScopeCalls, 1)
}

function testEmptyQueueDrainsAfterCallbackError () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const calls = []
  const expected = new Error('first callback failed')
  const { emnapiTSFN } = loadTSFN({
    wasmMemory: memory,
    dynCall () {
      calls.push(calls.length + 1)
      if (calls.length === 1) throw expected
    }
  })
  const queue = [11, 22]
  emnapiTSFN.getMutex = () => ({
    execute (callback) {
      return callback()
    }
  })
  emnapiTSFN.getQueueSize = () => queue.length
  emnapiTSFN.shiftQueue = () => queue.shift()
  emnapiTSFN.getCallJSCb = () => 1
  emnapiTSFN.getContext = () => 33

  assert.throws(
    () => emnapiTSFN.emptyQueue(1),
    error => error === expected
  )
  assert.deepStrictEqual(calls, [1, 2])
  assert.deepStrictEqual(queue, [])
}

function testCreateFailureDoesNotLeakCallbackReference () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 2,
    shared: true
  })
  const references = []
  const disposed = []
  let nextHandle = 100
  const envObject = {
    ensureHandleId () {
      return nextHandle++
    },
    setLastError (status) {
      return status
    }
  }
  const context = {
    envStore: new Map([[1, envObject]]),
    handleStore: new Map([
      [2, { value: function callback () {} }],
      [3, { value: 'resource name' }]
    ]),
    createReference (_envObject, handleId) {
      references.push(handleId)
      return {
        id: handleId + 1000,
        dispose () {
          disposed.push(handleId)
        }
      }
    }
  }
  let allocations = 0
  const loaded = loadTSFN({
    wasmMemory: memory,
    context,
    malloc () {
      allocations++
      return allocations === 1 ? 1024 : 0
    }
  })
  const status = loaded.exports.napi_create_threadsafe_function(
    1,
    2,
    0,
    3,
    0,
    1,
    0,
    0,
    0,
    0,
    256
  )
  assert.strictEqual(status, 9)
  assert.deepStrictEqual(references, [100])
  assert.deepStrictEqual(disposed, [100])
}

module.exports = (async () => {
  testMemoryRefresh()
  testSignedWasm32TopEndpoints()
  await testTransportThenableDeferral()
  testGeneratedMemoryAddressNormalization()
  testConfiguredGlobalTransportClassification()
  testGenerationTransportAndAccessors()
  testWorkerMessageValidation()
  testStaleGenerationGuards()
  testCreatorSideWakeupPromotion()
  testDefiniteFailureAfterDelivery()
  testRetryOwnershipAndRetiredMemory()
  testCreatorReclamationAndWorkerLoss()
  testWorkerRecoveryIsolation()
  await testSchedulerHardening()
  testFinalizeCleanupAfterError()
  testEmptyQueueDrainsAfterCallbackError()
  testCreateFailureDoesNotLeakCallbackReference()
})()
