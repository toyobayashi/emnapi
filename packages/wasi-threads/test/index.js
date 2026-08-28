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
  async function captureUncaught (callback) {
    let resolveUncaught
    const uncaught = new Promise(resolve => { resolveUncaught = resolve })
    process.setUncaughtExceptionCaptureCallback(resolveUncaught)
    try {
      callback()
      return await uncaught
    } finally {
      process.setUncaughtExceptionCaptureCallback(null)
    }
  }

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
    const error = await captureUncaught(() => worker.emit(event, value))
    assert.ok(error === value || error.message === 'Worker stopped with exit code ' + value)
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
  assert.strictEqual(Atomics.load(startSab, 0), 2)
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
  // In Node, a thrown worker error is delivered by worker_threads' native
  // error event. Do not race that event with a second protocol notification.
  assert.deepStrictEqual(defaultMessages, [])
}

await testThreadSpawnAfterCrossAgentMemoryGrowth()
await testThreadSpawnNormalizesBigintAddress()
await testThreadSpawnNormalizesNegativeAddress()
await testThreadSpawnRejectsSpoofedSharedBrand()
await testWorkerTrapIsTerminalWithoutChangingPThreadApi()
await testWorkerLoadFailureIsNotTerminal()
await testNativeWorkerErrorsAndExitAreTerminal()
testThreadMessageHandlerPreservesOriginalTrap()
await main(WASI, WASIThreads, Worker, process, './worker.js')
