import assert from 'node:assert/strict'
import { WASI } from 'wasi'
import { Worker } from 'worker_threads'
import { WASIThreads } from '@emnapi/wasi-threads'
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

await testThreadSpawnAfterCrossAgentMemoryGrowth()
await testThreadSpawnNormalizesBigintAddress()
await testThreadSpawnNormalizesNegativeAddress()
await testThreadSpawnRejectsSpoofedSharedBrand()
await main(WASI, WASIThreads, Worker, process, './worker.js')
