'use strict'
const assert = require('assert')
const common = require('../common')
const { load } = require('../util.mjs')
// const tick = require('util').promisify(require('../tick'))

const loadPromise = load('buffer')

// eslint-disable-next-line camelcase
module.exports = loadPromise.then(async binding => {
  await (async function () {
    assert.strictEqual(binding.newBuffer().toString(), binding.theText)
    assert.strictEqual(binding.newExternalBuffer().toString(), binding.theText)
    assert.strictEqual(binding.getDeleterCallCount(), 0)
    await common.gcUntil(() => binding.getDeleterCallCount() === 1)
    assert.strictEqual(binding.copyBuffer().toString(), binding.theText)

    let buffer = binding.staticBuffer()
    assert.strictEqual(binding.bufferHasInstance(buffer), true)
    assert.strictEqual(binding.bufferInfo(buffer), true)
    buffer = null
    await common.gcUntil(() => binding.getDeleterCallCount() === 2)

    // To test this doesn't crash
    binding.invalidObjectAsBuffer({})

    const testBuffer = binding.bufferFromArrayBuffer()
    assert(testBuffer instanceof Buffer, 'Expected a Buffer')
  })().then(common.mustCall())

  process.externalBuffer = binding.newExternalBuffer()
  assert.strictEqual(process.externalBuffer.toString(), binding.theText)

  let arrayBuffer
  let typedArray
  let dataView

  arrayBuffer = new ArrayBuffer(1)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), [0])
  new MessageChannel().port1.postMessage(arrayBuffer, [arrayBuffer])
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), [])

  arrayBuffer = new ArrayBuffer(6)
  typedArray = new Uint8Array(arrayBuffer)
  dataView = new DataView(arrayBuffer)
  typedArray.fill(66)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(66))
  typedArray.fill(99)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(arrayBuffer), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(99))

  const buffer = Buffer.allocUnsafe(6).fill(66)
  arrayBuffer = buffer.buffer
  typedArray = new Uint8Array(arrayBuffer, buffer.byteOffset, buffer.byteLength)
  dataView = new DataView(arrayBuffer, buffer.byteOffset, buffer.byteLength)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(buffer), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(66))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(66))
  buffer.fill(99)
  assert.deepStrictEqual(binding.getMemoryDataAsArray(buffer), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(typedArray), Array(6).fill(99))
  assert.deepStrictEqual(binding.getMemoryDataAsArray(dataView), Array(6).fill(99))

  const wasmMemory = loadPromise.Module && loadPromise.Module.wasmMemory
  if (wasmMemory && wasmMemory.buffer instanceof ArrayBuffer && !process.env.EMNAPI_TEST_4GB) {
    const growOnePage = () => {
      // Module.growMemory handles the index type of the memory
      // (wasmMemory.grow(1) throws on i64-indexed MEMORY64 memories)
      if (loadPromise.Module.growMemory) {
        loadPromise.Module.growMemory(wasmMemory.buffer.byteLength + 65536)
      } else {
        wasmMemory.grow(1)
      }
    }

    // Copying an external source bigger than the whole wasm memory into it must
    // grow (and detach) the non-shared memory inside the get-info call, before
    // the results are written back. The 4GB lane reserves 2GB before each test
    // module is initialized, so a larger-than-memory block cannot fit in wasm32.
    const sources = [
      (size) => Buffer.alloc(size, 44),
      (size) => new Uint8Array(size).fill(45).buffer,
      (size) => new DataView(new Uint8Array(size).fill(46).buffer)
    ]
    for (let i = 0; i < sources.length; ++i) {
      const initialMemoryByteLength = wasmMemory.buffer.byteLength
      assert.strictEqual(binding.getMemoryFirstByte(sources[i](initialMemoryByteLength + 1)), 44 + i)
      assert(wasmMemory.buffer.byteLength > initialMemoryByteLength)
    }

    // Native Node-API reads view metadata from the internal slots and never
    // consults user-installed accessors, so no user JS (which could grow and
    // detach a non-shared memory mid-call) can run inside a get-info call.
    // The blocks below pin that native-parity behavior: accessors are never
    // invoked, the memory does not grow, and the outputs report the true
    // slot values.
    const BYTE_OFFSET = 8
    const LEN = 4

    // own length/byteLength accessor (returning either a number or an
    // object whose valueOf() would grow the memory) must never be consulted
    for (const [Ctor, lengthProp] of [[Uint8Array, 'length'], [DataView, 'byteLength']]) {
      for (const returnValue of [LEN, { valueOf () { growOnePage(); return LEN } }]) {
        const view = new (class extends Ctor {})(wasmMemory.buffer, BYTE_OFFSET, LEN)
        let getterCalls = 0
        Object.defineProperty(view, lengthProp, {
          get () {
            getterCalls++
            growOnePage()
            return returnValue
          }
        })
        const bufferBeforeCall = wasmMemory.buffer
        const r = binding.getInfoOutputs(view)
        assert.strictEqual(getterCalls, 0, `the own ${lengthProp} accessor must not be consulted`)
        assert.strictEqual(wasmMemory.buffer, bufferBeforeCall, 'the memory must not grow during the call')
        assert.strictEqual(r.arraybuffer, wasmMemory.buffer)
        assert.strictEqual(r.byteOffset, BYTE_OFFSET)
        assert.strictEqual(r.length, LEN)
        assert.strictEqual(r.data, BYTE_OFFSET)
      }
    }

    // a lying (non-growing) length accessor is ignored: the outputs report
    // the true slot values, exactly like native Node-API
    {
      const view = new Uint8Array(wasmMemory.buffer, BYTE_OFFSET, LEN)
      let lengthReads = 0
      Object.defineProperty(view, 'length', {
        get () {
          lengthReads++
          return 2 // lie: the true length is 4
        }
      })
      const r = binding.getInfoOutputs(view)
      assert.strictEqual(lengthReads, 0, 'the own length accessor must not be consulted')
      assert.strictEqual(r.length, LEN)
      assert.strictEqual(r.byteOffset, BYTE_OFFSET)
      assert.strictEqual(r.data, BYTE_OFFSET)
    }

    // own byteOffset accessor must never be consulted
    for (const Ctor of [Uint8Array, DataView]) {
      const view = new Ctor(wasmMemory.buffer, BYTE_OFFSET, LEN)
      let byteOffsetReads = 0
      Object.defineProperty(view, 'byteOffset', {
        get () {
          byteOffsetReads++
          growOnePage()
          return BYTE_OFFSET
        }
      })
      const bufferBeforeCall = wasmMemory.buffer
      const r = binding.getInfoOutputs(view)
      assert.strictEqual(byteOffsetReads, 0, 'the own byteOffset accessor must not be consulted')
      assert.strictEqual(wasmMemory.buffer, bufferBeforeCall, 'the memory must not grow during the call')
      assert.strictEqual(r.arraybuffer, wasmMemory.buffer)
      assert.strictEqual(r.byteOffset, BYTE_OFFSET)
      assert.strictEqual(r.length, LEN)
      assert.strictEqual(r.data, BYTE_OFFSET)
    }

    // own buffer accessor (returning a cached buffer it detached by growing)
    // must never be consulted; the arraybuffer output is the real buffer
    for (const Ctor of [Uint8Array, DataView]) {
      const view = new Ctor(wasmMemory.buffer, BYTE_OFFSET, LEN)
      let bufferReads = 0
      let cached = null
      Object.defineProperty(view, 'buffer', {
        get () {
          bufferReads++
          if (cached === null) {
            cached = wasmMemory.buffer
            growOnePage()
          }
          return cached
        }
      })
      const bufferBeforeCall = wasmMemory.buffer
      const r = binding.getInfoOutputs(view)
      assert.strictEqual(bufferReads, 0, 'the own buffer accessor must not be consulted')
      assert.strictEqual(wasmMemory.buffer, bufferBeforeCall, 'the memory must not grow during the call')
      assert.strictEqual(r.arraybuffer, wasmMemory.buffer)
      assert.strictEqual(r.byteOffset, BYTE_OFFSET)
      assert.strictEqual(r.length, LEN)
      assert.strictEqual(r.data, BYTE_OFFSET)
    }

    // own byteLength accessor on an ArrayBuffer must never be consulted by
    // napi_get_arraybuffer_info; the byte_length output is the slot value
    {
      const ab = new ArrayBuffer(8)
      new Uint8Array(ab).fill(66)
      let byteLengthReads = 0
      Object.defineProperty(ab, 'byteLength', {
        get () {
          byteLengthReads++
          return 4 // lie: the true byteLength is 8
        }
      })
      const arr = binding.getMemoryDataAsArray(ab)
      assert.strictEqual(byteLengthReads, 0, 'the own byteLength accessor must not be consulted')
      assert.deepStrictEqual(arr, Array(8).fill(66))
    }

    // cross-realm views over the wasm memory: internal-slot reads and
    // classification are realm-independent (native parity)
    {
      const vm = require('vm')
      const realm = { buffer: wasmMemory.buffer, BYTE_OFFSET, LEN }
      const crossTypedArray = vm.runInNewContext('new Uint16Array(buffer, BYTE_OFFSET, LEN)', realm)
      const rTypedArray = binding.getInfoOutputs(crossTypedArray, true)
      assert.strictEqual(rTypedArray.type, 4 /* napi_uint16_array */)
      assert.strictEqual(rTypedArray.length, LEN)
      assert.strictEqual(rTypedArray.byteOffset, BYTE_OFFSET)
      assert.strictEqual(rTypedArray.data, BYTE_OFFSET)
      assert.strictEqual(rTypedArray.arraybuffer, wasmMemory.buffer)

      // the routed path (napi_is_dataview is realm-local -> false -> typed
      // array info) covers the tag-rule half
      const crossDataView = vm.runInNewContext('new DataView(buffer, BYTE_OFFSET, LEN)', realm)
      const rDataView = binding.getInfoOutputs(crossDataView)
      assert.strictEqual(rDataView.length, LEN)
      assert.strictEqual(rDataView.byteOffset, BYTE_OFFSET)
      assert.strictEqual(rDataView.data, BYTE_OFFSET)
      assert.strictEqual(rDataView.arraybuffer, wasmMemory.buffer)

      // and napi_get_dataview_info itself must accept the cross-realm DataView
      // (unconditional entry, no realm-local instanceof guard)
      const rDirect = binding.getDataViewInfoOutputs(crossDataView)
      assert.strictEqual(rDirect.status, 0 /* napi_ok */)
      assert.strictEqual(rDirect.length, LEN)
      assert.strictEqual(rDirect.byteOffset, BYTE_OFFSET)
      assert.strictEqual(rDirect.data, BYTE_OFFSET)
      assert.strictEqual(rDirect.arraybuffer, wasmMemory.buffer)
    }

    // Reconstructing a stale registered view after a growth must not run a
    // user subclass constructor: it would run AFTER the fresh buffer was
    // captured as an argument, so a growth inside it would hand back
    // stale/detached outputs with napi_ok.
    for (const Base of [Uint8Array, DataView]) {
      let armed = false
      let userCtorCalls = 0
      class GrowingView extends Base {
        constructor (...args) {
          super(...args)
          if (armed) {
            userCtorCalls++
            growOnePage()
          }
        }
      }
      const view = new GrowingView(wasmMemory.buffer, BYTE_OFFSET, LEN)
      // register the descriptor while the subclass constructor is inert
      const r1 = binding.getInfoOutputs(view)
      assert.strictEqual(r1.length, LEN)
      // detach the registered view's buffer, then arm the constructor so a
      // (wrong) reconstruction through it would grow and detach again
      growOnePage()
      armed = true
      const bufferBeforeCall = wasmMemory.buffer
      const r = binding.getInfoOutputs(view)
      assert.strictEqual(userCtorCalls, 0, 'emnapi must not invoke the user subclass constructor')
      assert.strictEqual(wasmMemory.buffer, bufferBeforeCall, 'the memory must not grow during the call')
      assert.strictEqual(r.arraybuffer, wasmMemory.buffer)
      assert.strictEqual(r.byteOffset, BYTE_OFFSET)
      assert.strictEqual(r.length, LEN)
      assert.strictEqual(r.data, BYTE_OFFSET)
    }

    // issue #143 / hidden-global realm: a genuine SharedArrayBuffer must be
    // accepted by napi_get_arraybuffer_info even when the SharedArrayBuffer
    // global was deleted before emnapi initialized (the child deletes it
    // before loading the module). Non-shared builds only — on a shared-memory
    // build the threaded worker bootstrap itself needs the global.
    const { spawnSync } = require('child_process')
    const path = require('path')
    const child = spawnSync(process.execPath, [path.join(__dirname, 'hidden-sab-global.js')], {
      env: process.env,
      encoding: 'utf8'
    })
    assert.strictEqual(child.status, 0, `hidden-sab-global child failed\nstdout: ${child.stdout}\nstderr: ${child.stderr}`)
  }

  // sanity pin for the unconditional napi_get_arraybuffer_info helper
  const abInfo = binding.getArrayBufferInfoOutputs(new ArrayBuffer(8))
  assert.strictEqual(abInfo.status, 0 /* napi_ok */)
  assert.strictEqual(abInfo.byteLength, 8)
})
