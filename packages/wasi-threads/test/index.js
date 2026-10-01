import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { WASI } from 'wasi'
import { Worker } from 'worker_threads'
import {
  ThreadManager,
  ThreadMessageHandler,
  WASIThreads
} from '@emnapi/wasi-threads'
import { main } from './run.js'

async function testThreadSpawnAfterCrossAgentMemoryGrowth () {
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 3,
    shared: true
  })
  const staleBuffer = memory.buffer
  const worker = new Worker(
    new URL('./grow-memory-worker.js', import.meta.url),
    {
      type: 'module',
      workerData: { memory }
    }
  )
  await new Promise((resolve, reject) => {
    worker.once('message', resolve)
    worker.once('error', reject)
  })
  await worker.terminate()

  const memoryBufferGetter = Object.getOwnPropertyDescriptor(
    WebAssembly.Memory.prototype,
    'buffer'
  ).get
  const originalGrow = memory.grow.bind(memory)
  let stale = true
  let refreshDelta
  Object.defineProperties(memory, {
    buffer: {
      configurable: true,
      get () {
        return stale ? staleBuffer : memoryBufferGetter.call(memory)
      }
    },
    grow: {
      configurable: true,
      value (delta) {
        refreshDelta = delta
        stale = false
        return originalGrow(delta)
      }
    }
  })

  let spawnMessage
  const wasiThreads = new WASIThreads({
    wasi: {
      initialize () {},
      start () {
        return 0
      }
    },
    childThread: true,
    postMessage (message) {
      spawnMessage = message
      const address = message.__emnapi__.payload.errorOrTid
      const struct = new Int32Array(
        memoryBufferGetter.call(memory),
        address,
        2
      )
      Atomics.store(struct, 0, 1)
      Atomics.store(struct, 1, 6)
      Atomics.notify(struct, 1)
    }
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)

  const errorOrTid = staleBuffer.byteLength
  try {
    const result = wasiThreads.getImportObject().wasi['thread-spawn'](
      123,
      errorOrTid
    )
    const currentBuffer = memoryBufferGetter.call(memory)
    const struct = new Int32Array(currentBuffer, errorOrTid, 2)

    assert.strictEqual(result, 1)
    assert.strictEqual(refreshDelta, 0)
    assert.strictEqual(stale, false)
    assert.strictEqual(
      spawnMessage.__emnapi__.payload.errorOrTid,
      errorOrTid
    )
    assert.deepStrictEqual(Array.from(struct), [1, 6])
  } finally {
    delete memory.buffer
    delete memory.grow
  }
}

// The thread-spawn result pointer crosses the wasm ABI: a memory64 address
// arrives as a bigint, and an upper-half wasm32 address arrives as a negative
// Number. The helper must normalize both before touching the memory.
async function testThreadSpawnNormalizesBigintAddress () {
  const memory = new WebAssembly.Memory({ initial: 2, maximum: 3, shared: true })
  let spawnMessage
  const wasiThreads = new WASIThreads({
    wasi: { initialize () {}, start () { return 0 } },
    childThread: true,
    postMessage (message) {
      spawnMessage = message
      // the payload carries the raw (bigint) address; normalize to read it
      const address = Number(message.__emnapi__.payload.errorOrTid)
      const struct = new Int32Array(memory.buffer, address, 2)
      Atomics.store(struct, 0, 1)
      Atomics.store(struct, 1, 6)
      Atomics.notify(struct, 1)
    }
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)

  // in-range address supplied as a bigint (memory64 ABI). Before the fix the
  // helper evaluated `address + SIZE` mixing bigint and number and threw.
  const result = wasiThreads.getImportObject().wasi['thread-spawn'](123, 64n)
  const struct = new Int32Array(memory.buffer, 64, 2)
  assert.strictEqual(result, 1)
  assert.strictEqual(spawnMessage.__emnapi__.payload.errorOrTid, 64n)
  assert.deepStrictEqual(Array.from(struct), [1, 6])
}

// An upper-half wasm32 address arrives negative; it must be read at
// `address >>> 0`. When normalized, the (now huge) offset exceeds the current
// buffer length, so the shared-memory refresh gate fires — observable as a
// grow() call. Before the fix the raw negative address failed the gate
// (`-8 + 8 > byteLength` is false), so no refresh was attempted.
async function testThreadSpawnNormalizesNegativeAddress () {
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true })
  let growCalls = 0
  const originalGrow = memory.grow.bind(memory)
  Object.defineProperty(memory, 'grow', {
    configurable: true,
    value (delta) { growCalls++; return originalGrow(delta) }
  })
  const wasiThreads = new WASIThreads({
    wasi: { initialize () {}, start () { return 0 } },
    childThread: true,
    postMessage () {}
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)

  try {
    // -8 normalizes to 0xFFFFFFF8, far beyond the 1-page buffer, so the
    // Int32Array construction still fails — but the refresh gate must have
    // fired first, proving the address was read at `>>> 0`.
    assert.throws(
      () => wasiThreads.getImportObject().wasi['thread-spawn'](123, -8),
      RangeError
    )
    assert.strictEqual(growCalls, 1, 'the normalized (>>> 0) offset must trip the refresh gate')
  } finally {
    delete memory.grow
  }
}

// A buffer with a spoofed 'SharedArrayBuffer' @@toStringTag (which fools
// Object.prototype.toString) must NOT be treated as shared: growing it —
// even by zero — would detach an unshared buffer.
async function testThreadSpawnRejectsSpoofedSharedBrand () {
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 2 }) // unshared
  Object.defineProperty(memory.buffer, Symbol.toStringTag, {
    value: 'SharedArrayBuffer',
    configurable: true
  })
  const oldBuffer = memory.buffer
  let growCalls = 0
  const originalGrow = memory.grow.bind(memory)
  Object.defineProperty(memory, 'grow', {
    configurable: true,
    value (delta) { growCalls++; return originalGrow(delta) }
  })

  const wasiThreads = new WASIThreads({
    wasi: { initialize () {}, start () { return 0 } },
    childThread: true,
    postMessage () {}
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)

  const outOfRangeAddress = oldBuffer.byteLength + 64
  try {
    assert.throws(
      () => wasiThreads.getImportObject().wasi['thread-spawn'](123, outOfRangeAddress),
      RangeError
    )
    assert.strictEqual(growCalls, 0, 'must not grow a non-conclusively-shared buffer')
    assert.strictEqual(oldBuffer.byteLength, 65536, 'the unshared buffer must not be detached')
    assert.strictEqual(memory.buffer, oldBuffer, 'the memory buffer must be unchanged')
  } finally {
    delete memory.grow
  }
}

class FakeWorker extends EventEmitter {
  constructor (onPostMessage) {
    super()
    this.onPostMessage = onPostMessage
    this.terminated = false
  }

  postMessage (message) {
    this.onPostMessage?.(message, this)
  }

  terminate () {
    this.terminated = true
    return Promise.resolve(0)
  }

  ref () {}
  unref () {}
}

const message = (type, payload) => ({ __emnapi__: { type, payload } })

async function testWorkerTrapIsTerminalWithoutChangingPThreadApi () {
  const created = []
  const manager = new ThreadManager({
    reuseWorker: 1,
    onCreateWorker () {
      const worker = new FakeWorker((data, currentWorker) => {
        if (data.__emnapi__?.type === 'load') {
          Promise.resolve().then(() => currentWorker.emit('message', message('loaded', {})))
        }
      })
      created.push(worker)
      return worker
    }
  })
  manager.init()
  manager.setup({}, {})
  await manager.preloadWorkers()

  const pooledWorker = manager.unusedWorkers[0]
  const asyncWorker = new FakeWorker((data, currentWorker) => {
    if (data.__emnapi__?.type === 'load') {
      Promise.resolve().then(() => currentWorker.emit('message', message('loaded', {})))
    }
  })
  await manager.loadWasmModuleToWorker(asyncWorker)
  manager.markId(pooledWorker)

  let resolveUncaught
  const uncaught = new Promise(resolve => { resolveUncaught = resolve })
  process.setUncaughtExceptionCaptureCallback(resolveUncaught)
  try {
    asyncWorker.emit('message', message('thread-error', {
      error: {
        name: 'RuntimeError',
        message: 'memory access out of bounds',
        stack: 'RuntimeError: memory access out of bounds\n    at wasi_thread_start'
      },
      phase: 'async-work'
    }))
    const error = await uncaught
    assert.strictEqual(error.name, 'RuntimeError')
    assert.strictEqual(error.message, 'memory access out of bounds')
    assert.match(error.stack, /wasi_thread_start/)
  } finally {
    process.setUncaughtExceptionCaptureCallback(null)
  }

  assert.strictEqual(pooledWorker.terminated, true)
  assert.strictEqual(asyncWorker.terminated, true)
  assert.strictEqual(manager.unusedWorkers.length, 0)
  assert.deepStrictEqual(Object.keys(manager.pthreads), [])
  assert.strictEqual(created.length, 1, 'fatal cleanup must not recreate the worker pool')
  assert.throws(() => manager.getNewWorker(), /memory access out of bounds/)

  // The compatibility boundary remains the Emscripten PThread surface; no
  // emnapi-only state or failure methods are added to the manager instance.
  assert.strictEqual('state' in manager, false)
  assert.strictEqual('fatalError' in manager, false)
  assert.strictEqual('throwIfFailed' in manager, false)
  assert.strictEqual('addThreadErrorListener' in manager, false)
}

async function testWorkerLoadFailureIsNotTerminal () {
  const manager = new ThreadManager({
    onCreateWorker: () => new FakeWorker()
  })
  manager.init()
  manager.setup({}, {})
  const worker = new FakeWorker((data, currentWorker) => {
    if (data.__emnapi__?.type === 'load') {
      Promise.resolve().then(() => currentWorker.emit('message', message('thread-error', {
        error: { name: 'TypeError', message: 'bad wasm module' },
        phase: 'load'
      })))
    }
  })

  await assert.rejects(manager.loadWasmModuleToWorker(worker), /bad wasm module/)
  assert.strictEqual(worker.terminated, true)
  const nextWorker = manager.allocateUnusedWorker()
  assert.ok(nextWorker)
  manager.terminateAllThreads()
}

async function testNativeWorkerErrorsAndExitAreTerminal () {
  async function run (event, value) {
    const manager = new ThreadManager({
      printErr () {},
      onCreateWorker: () => new FakeWorker((data, currentWorker) => {
        if (data.__emnapi__?.type === 'load') {
      Promise.resolve().then(() => currentWorker.emit('message', message('loaded', {})))
        }
      })
    })
    manager.setup({}, {})
    const worker = manager.allocateUnusedWorker()
    await manager.loadWasmModuleToWorker(worker)
    assert.throws(
      () => worker.emit(event, value),
      error => error === value || error.message === 'Worker stopped with exit code ' + value
    )
    assert.strictEqual(worker.terminated, true)
    // The second native event is the expected exit generated by termination.
    assert.doesNotThrow(() => worker.emit('exit', 1))
  }

  await run('error', new Error('native worker error'))
  await run('exit', 17)
}

function testThreadMessageHandlerPreservesOriginalTrap () {
  const trap = new WebAssembly.RuntimeError('memory access out of bounds')
  const messages = []
  const startSab = new Int32Array(new SharedArrayBuffer(16 + 8192))
  let receivedError
  const handler = new ThreadMessageHandler({
    postMessage: data => { messages.push(data) },
    onLoad: () => ({
      instance: {
        exports: {
          wasi_thread_start () { throw trap }
        }
      }
    }),
    onError: error => { receivedError = error }
  })

  handler.handle({ data: message('load', { wasmModule: {}, wasmMemory: {} }) })
  handler.handle({ data: message('start', { tid: 43, arg: 0, sab: startSab }) })

  assert.strictEqual(receivedError, trap)
  // Starting the pthread succeeded; the trap is reported through the worker
  // error path after the start notification and must not turn creation into a
  // failed spawn that can terminate the worker before the native error event.
  assert.strictEqual(Atomics.load(startSab, 0), 1)
  const threadError = messages.find(data => data.__emnapi__?.type === 'thread-error')
  assert.ok(threadError)
  assert.strictEqual(threadError.__emnapi__.payload.error.name, 'RuntimeError')
  assert.strictEqual(threadError.__emnapi__.payload.error.message, trap.message)
  assert.strictEqual(threadError.__emnapi__.payload.phase, 'start')
  assert.strictEqual(threadError.__emnapi__.payload.tid, 43)

  const defaultMessages = []
  const defaultHandler = new ThreadMessageHandler({
    postMessage (data) { defaultMessages.push(data) },
    onLoad: () => ({
      instance: {
        exports: {
          wasi_thread_start () { throw trap }
        }
      }
    })
  })
  defaultHandler.handle({ data: message('load', { wasmModule: {}, wasmMemory: {} }) })
  defaultMessages.length = 0
  assert.throws(
    () => defaultHandler.handle({ data: message('start', { tid: 44, arg: 0 }) }),
    error => error === trap
  )
  assert.deepStrictEqual(defaultMessages, [])
}

// A worker that loads only when told to, so a test can order the outcome.
function createDeferredWorker (created) {
  const worker = new FakeWorker((data, currentWorker) => {
    currentWorker.posts.push(data.__emnapi__?.type)
  })
  worker.posts = []
  worker.finishLoad = () => worker.emit('message', message('loaded', {}))
  worker.failLoad = (text) => worker.emit('message', message('thread-error', {
    error: { name: 'Error', message: text },
    phase: 'load'
  }))
  created.push(worker)
  return worker
}

async function testTerminatedIdleWorkerLeavesPool () {
  const created = []
  const manager = new ThreadManager({
    printErr () {},
    reuseWorker: 2,
    onCreateWorker: () => createDeferredWorker(created)
  })
  manager.init()
  manager.setup({}, {})
  const [first, second] = manager.unusedWorkers
  manager.terminateWorker(first)
  assert.strictEqual(first.terminated, true)
  assert.deepStrictEqual(manager.unusedWorkers, [second])
  const popped = manager.getNewWorker()
  assert.strictEqual(popped, second)
  const fresh = manager.getNewWorker()
  assert.notStrictEqual(fresh, first)
  assert.strictEqual(fresh.terminated, false)
  assert.strictEqual(created.length, 3)
  manager.terminateAllThreads()
}

async function testBackgroundPreloadDropsOnlyFailedWorker () {
  const created = []
  const unhandled = []
  const onUnhandled = (reason) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const manager = new ThreadManager({
      printErr () {},
      reuseWorker: 2,
      onCreateWorker: () => createDeferredWorker(created)
    })
    manager.init()
    manager.setup({}, {})
    // What @emnapi/core does on a synchronous instantiate with a pool.
    for (const worker of manager.unusedWorkers.slice()) {
      if (!worker.whenLoaded) manager.loadWasmModuleToWorker(worker).then(undefined, () => {})
    }
    const [w0, w1] = created
    assert.deepStrictEqual(w0.posts, ['load'])
    assert.deepStrictEqual(w1.posts, ['load'])
    w0.failLoad('w0 failed to load')
    await assert.rejects(w0.whenLoaded, /w0 failed to load/)
    w1.finishLoad()
    await w1.whenLoaded
    await new Promise(resolve => setImmediate(resolve))

    assert.strictEqual(w0.terminated, true)
    assert.strictEqual(w1.terminated, false)
    assert.strictEqual(w1.loaded, true)
    // The failed worker's slot gets a fresh, unloaded worker; the rest of the
    // pool is not re-created.
    assert.strictEqual(created.length, 3, 'one failed load must only replace that worker')
    const replacement = created[2]
    assert.deepStrictEqual(manager.unusedWorkers, [w1, replacement])
    assert.strictEqual(replacement.whenLoaded, undefined)
    assert.deepStrictEqual(replacement.posts, [])
    assert.deepStrictEqual(unhandled, [])
    manager.terminateAllThreads()
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
}

// Load a second copy of the package with Node.js detection off, so the
// browser-only paths (for example the strict pool limit) run.
async function importWithoutNodeDetection () {
  const url = import.meta.resolve('@emnapi/wasi-threads') + '?no-node'
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'process')
  Object.defineProperty(globalThis, 'process', { configurable: true, writable: true, value: undefined })
  try {
    return await import(url)
  } finally {
    Object.defineProperty(globalThis, 'process', descriptor)
  }
}

// A strict pool must keep its size when background preloads fail, or every
// later spawn finds the pool exhausted and fails with EAGAIN.
async function testStrictPoolKeepsSizeWhenPreloadsFail () {
  const { WASIThreads: BrowserWASIThreads } = await importWithoutNodeDetection()
  const created = []
  const errors = []
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
  const wasiThreads = new BrowserWASIThreads({
    wasi: { initialize () {}, start () { return 0 } },
    printErr (text) { errors.push(text) },
    reuseWorker: { size: 2, strict: true },
    onCreateWorker: () => createDeferredWorker(created)
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)
  const manager = wasiThreads.PThread
  // What @emnapi/core does on a synchronous instantiate with a pool.
  for (const worker of manager.unusedWorkers.slice()) {
    if (!worker.whenLoaded) manager.loadWasmModuleToWorker(worker).then(undefined, () => {})
  }
  const [w0, w1] = created
  // Without Node.js detection, messages arrive through onmessage only.
  for (const worker of [w0, w1]) {
    worker.onmessage({
      data: message('thread-error', { error: { name: 'Error', message: 'preload failed' }, phase: 'load' })
    })
  }
  await new Promise(resolve => setImmediate(resolve))
  assert.strictEqual(w0.terminated, true)
  assert.strictEqual(w1.terminated, true)
  assert.strictEqual(manager.unusedWorkers.length, 2, 'the strict pool must keep its size')
  assert.strictEqual(created.length, 4)

  const result = wasiThreads.getImportObject().wasi['thread-spawn'](0, 64)
  assert.strictEqual(result, 0)
  const worker = created[3]
  const struct = new Int32Array(memory.buffer, 64, 2)
  assert.deepStrictEqual(Array.from(struct), [0, worker.__emnapi_tid])
  assert.deepStrictEqual(worker.posts, ['load', 'start'])
  assert.strictEqual(created.length, 4)
  assert.deepStrictEqual(errors.filter(text => /exhausted/.test(text)), [])
  manager.terminateAllThreads()
}

// When a spawned thread's worker fails to load after thread-spawn returned
// success, the failure is cleaned up and reported, not rethrown into a
// promise nobody holds (an unhandled rejection makes Node.js exit with 1).
async function testLoadFailureAfterSpawnIsReported () {
  const created = []
  const errors = []
  const unhandled = []
  const onUnhandled = (reason) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
    const wasiThreads = new WASIThreads({
      wasi: { initialize () {}, start () { return 0 } },
      printErr (text) { errors.push(text) },
      reuseWorker: 1,
      onCreateWorker: () => createDeferredWorker(created)
    })
    wasiThreads.setup({ exports: { memory } }, {}, memory)
    const manager = wasiThreads.PThread
    // What @emnapi/core does on a synchronous instantiate with a pool.
    for (const worker of manager.unusedWorkers.slice()) {
      if (!worker.whenLoaded) manager.loadWasmModuleToWorker(worker).then(undefined, () => {})
    }
    const [worker] = created
    const result = wasiThreads.getImportObject().wasi['thread-spawn'](0, 64)
    assert.strictEqual(result, 0)
    assert.deepStrictEqual(worker.posts, ['load', 'start'])
    const tid = worker.__emnapi_tid
    assert.ok(tid)
    worker.failLoad('load failed after spawn')
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))

    assert.deepStrictEqual(unhandled, [])
    assert.strictEqual(worker.terminated, true)
    assert.deepStrictEqual(Object.keys(manager.pthreads), [])
    const reported = errors.filter(text => text.includes('load failed after spawn'))
    assert.strictEqual(reported.length, 1)
    assert.match(reported[0], new RegExp('thread ' + tid + ':'))
    manager.terminateAllThreads()
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
}

async function testSpawnLoadsNeverLoadedPoolWorker () {
  const created = []
  const memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true })
  const wasiThreads = new WASIThreads({
    wasi: { initialize () {}, start () { return 0 } },
    printErr () {},
    reuseWorker: 1,
    onCreateWorker: () => createDeferredWorker(created)
  })
  wasiThreads.setup({ exports: { memory } }, {}, memory)
  const manager = wasiThreads.PThread
  assert.strictEqual(created.length, 1)
  assert.strictEqual(created[0].whenLoaded, undefined)

  const result = wasiThreads.getImportObject().wasi['thread-spawn'](0, 64)
  assert.strictEqual(result, 0)
  const struct = new Int32Array(memory.buffer, 64, 2)
  assert.deepStrictEqual(Array.from(struct), [0, created[0].__emnapi_tid])
  assert.deepStrictEqual(created[0].posts, ['load', 'start'])
  assert.strictEqual(created.length, 1)
  created[0].finishLoad()
  await created[0].whenLoaded
  manager.terminateAllThreads()
}

async function testLateLoadedFromTerminatedWorkerIsQuiet () {
  const errors = []
  const manager = new ThreadManager({
    printErr (text) { errors.push(text) },
    onCreateWorker: () => new FakeWorker()
  })
  manager.setup({}, {})
  const worker = manager.allocateUnusedWorker()
  manager.loadWasmModuleToWorker(worker).then(undefined, () => {})
  manager.terminateWorker(worker)
  worker.emit('message', message('loaded', {}))
  assert.deepStrictEqual(errors, [])
  worker.emit('message', message('cleanup-thread', { tid: 43 }))
  assert.strictEqual(errors.length, 1)
  assert.match(errors[0], /received "cleanup-thread" command from terminated worker/)
}

function testQueuedStartIsFailedWhenLoadFails () {
  const startSab = new Int32Array(new SharedArrayBuffer(16 + 8192))
  const loadSab = new Int32Array(new SharedArrayBuffer(16 + 8192))
  let rejectLoad
  const handler = new ThreadMessageHandler({
    postMessage () {},
    onLoad: () => new Promise((resolve, reject) => { rejectLoad = reject }),
    onError () {}
  })
  handler.handle({ data: message('load', { wasmModule: {}, wasmMemory: {}, sab: loadSab }) })
  handler.handle({ data: message('start', { tid: 43, arg: 0, sab: startSab }) })
  assert.strictEqual(Atomics.load(startSab, 0), 0)
  rejectLoad(new Error('instantiate failed'))
  return Promise.resolve().then(() => {
    // 2 is the load-failure code that _loaded also writes to the 'load' sab.
    assert.strictEqual(Atomics.load(loadSab, 0), 2)
    assert.strictEqual(Atomics.load(startSab, 0), 2)
  })
}

await testThreadSpawnAfterCrossAgentMemoryGrowth()
await testThreadSpawnNormalizesBigintAddress()
await testThreadSpawnNormalizesNegativeAddress()
await testThreadSpawnRejectsSpoofedSharedBrand()
await testWorkerTrapIsTerminalWithoutChangingPThreadApi()
await testWorkerLoadFailureIsNotTerminal()
await testNativeWorkerErrorsAndExitAreTerminal()
testThreadMessageHandlerPreservesOriginalTrap()
await testTerminatedIdleWorkerLeavesPool()
await testBackgroundPreloadDropsOnlyFailedWorker()
await testStrictPoolKeepsSizeWhenPreloadsFail()
await testLoadFailureAfterSpawnIsReported()
await testSpawnLoadsNeverLoadedPoolWorker()
await testLateLoadedFromTerminatedWorkerIsQuiet()
await testQueuedStartIsFailedWhenLoadFails()
await main(WASI, WASIThreads, Worker, process, './worker.js')
