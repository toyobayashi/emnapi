(function (main) {
  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'

  if (ENVIRONMENT_IS_NODE) {
    const _require = function (request) {
      if (request === '@emnapi/wasi-threads') return require('..')
      return require(request)
    }
    main(_require, process, __dirname)
  } else {
    if (typeof importScripts === 'function') {
      // eslint-disable-next-line no-undef
      importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
      // eslint-disable-next-line no-undef
      importScripts('../dist/wasi-threads.js')
      // eslint-disable-next-line no-undef
      importScripts('./proxy.js')
    }

    const nodeWasi = { WASI: globalThis.wasmUtil.WASI }
    const nodePath = {
      join: function () {
        return Array.prototype.join.call(arguments, '/')
      }
    }
    const nodeWorkerThreads = {
      Worker: globalThis.proxyWorker.Worker
    }
    const _require = function (request) {
      if (request === '@emnapi/wasi-threads') return globalThis.wasiThreads
      if (request === 'node:worker_threads' || request === 'worker_threads') return nodeWorkerThreads
      if (request === 'node:wasi' || request === 'wasi') return nodeWasi
      if (request === 'node:path' || request === 'path') return nodePath
      throw new Error('Can not find module: ' + request)
    }
    const _process = {
      env: {},
      exit: () => {}
    }
    main(_require, _process, '.')
  }
})(async function (require, process, __dirname) {
  const { WASI } = require('node:wasi')
  const { WASIThreads } = require('@emnapi/wasi-threads')
  const { Worker } = require('node:worker_threads')
  const { join } = require('node:path')

  // This entry is shared by the Node lane and the browser (worker) lane. The
  // `thread-spawn` regression tests below need `node:assert` and worker
  // `workerData`, neither of which the browser lane provides, so they are
  // gated the same way the surrounding bootstrap code gates itself.
  const ENVIRONMENT_IS_NODE =
    typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string'
  const assert = ENVIRONMENT_IS_NODE ? require('node:assert/strict') : null

  // Growing shared wasm memory in one agent leaves every other agent holding
  // the previous, shorter buffer object. `thread-spawn` used to build its
  // result view straight off that stale buffer, so an in-range result pointer
  // that happened to live above the old length blew up with a RangeError.
  async function testThreadSpawnAfterCrossAgentMemoryGrowth () {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 3,
      shared: true
    })
    const staleBuffer = memory.buffer
    const worker = new Worker(join(__dirname, 'grow-memory-worker.js'), {
      workerData: { memory }
    })
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

    // an address that only exists in the grown memory
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
  // Number. Both have to be normalized before touching the memory.
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

    // in-range address supplied as a bigint (memory64 ABI). Unnormalized it
    // reaches `new Int32Array(buffer, 64n, 2)`, which throws a TypeError
    // because a bigint cannot be coerced to a byte offset.
    const result = wasiThreads.getImportObject().wasi['thread-spawn'](123, 64n)
    const struct = new Int32Array(memory.buffer, 64, 2)
    assert.strictEqual(result, 1)
    assert.strictEqual(spawnMessage.__emnapi__.payload.errorOrTid, 64n)
    assert.deepStrictEqual(Array.from(struct), [1, 6])
  }

  // An upper-half wasm32 address arrives negative; it must be read at
  // `address >>> 0`. When normalized, the (now huge) offset exceeds the current
  // buffer length, so the shared-memory refresh gate fires — observable as a
  // grow() call. With the raw negative address the gate cannot fire
  // (`-8 + 8 > byteLength` is false), so no refresh would be attempted.
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
  // Object.prototype.toString, and therefore isSharedArrayBuffer()) must NOT be
  // treated as shared: growing it — even by zero — would detach an unshared
  // buffer and invalidate every view the embedder holds.
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

  async function run (file) {
    const wasi = new WASI({
      version: 'preview1',
      args: [file, 'node'],
      env: process.env
    })
    const wasiThreads = new WASIThreads({
      wasi,
      onCreateWorker: ({ name }) => {
        return new Worker(join(__dirname, 'worker.js'), {
          name,
          workerData: {
            name
          },
          env: process.env,
          execArgv: ['--experimental-wasi-unstable-preview1']
        })
      },
      // optional
      waitThreadStart: 1000
    })
    const memory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 4294967296 / 65536,
      shared: true
    })
    let input
    try {
      input = require('node:fs').readFileSync(require('node:path').join(__dirname, file))
    } catch (err) {
      console.warn(err)
      const response = await fetch(file)
      input = await response.arrayBuffer()
    }
    let { module, instance } = await WebAssembly.instantiate(input, {
      env: {
        memory,
        print_string: function (ptr) {
          const HEAPU8 = new Uint8Array(memory.buffer)
          let len = 0
          while (HEAPU8[ptr + len] !== 0) len++
          const string = new TextDecoder().decode(HEAPU8.slice(ptr, ptr + len))
          console.log(string)
        }
      },
      ...wasi.getImportObject(),
      ...wasiThreads.getImportObject()
    })

    if (typeof instance.exports._start === 'function') {
      const { exitCode } = wasiThreads.start(instance, module, memory)
      return exitCode
    } else {
      instance = wasiThreads.initialize(instance, module, memory)
      return instance.exports.fn(1)
    }
  }

  if (ENVIRONMENT_IS_NODE) {
    console.log('-------- thread-spawn result view --------')
    await testThreadSpawnAfterCrossAgentMemoryGrowth()
    await testThreadSpawnNormalizesBigintAddress()
    await testThreadSpawnNormalizesNegativeAddress()
    await testThreadSpawnRejectsSpoofedSharedBrand()
  }

  console.log('-------- command --------')
  await run('main.wasm')
  console.log('-------- reactor --------')
  await run('lib.wasm')
})
