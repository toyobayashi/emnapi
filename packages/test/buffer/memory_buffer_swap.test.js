'use strict'
// memory.grow gives a shared WebAssembly.Memory a new `buffer` object. Any
// thread's grow does this on every thread, at the next interrupt check (in
// Node.js 24 even grow(0) does it), so it can happen between two reads of
// wasmMemory.buffer inside one emnapi call. The old object is still the wasm
// memory: get-info must give native code the view's own address and must not
// copy the memory (native writes to a copy never reach the view).
//
// The test makes this deterministic: memory.buffer's getter calls grow(1)
// right after its N-th read during one call, for every N the call makes.
// (grow(1), not grow(0): newer V8, e.g. in Chrome, keeps the buffer object
// when the length does not change.)
const assert = require('assert')
const { load } = require('../util.mjs')

const loadPromise = load('buffer')

module.exports = loadPromise.then(binding => {
  const seed = binding.staticBuffer()
  if (!(seed.buffer instanceof SharedArrayBuffer)) {
    // a non-shared memory only grows from code running on this thread, and
    // none runs between those reads
    console.log('memory is not shared, skip')
    return
  }

  const descriptor = Object.getOwnPropertyDescriptor(WebAssembly.Memory.prototype, 'buffer')
  const getBuffer = descriptor.get
  let memory
  let reads = 0
  let growAfter = 0
  Object.defineProperty(WebAssembly.Memory.prototype, 'buffer', {
    ...descriptor,
    get () {
      const buffer = getBuffer.call(this)
      if (memory === undefined && buffer === seed.buffer) memory = this
      if (this === memory && ++reads === growAfter) this.grow(1)
      return buffer
    }
  })

  const address = seed.byteOffset
  const length = seed.length
  // a view emnapi made, and views JavaScript made that emnapi has seen once
  const seenView = new Uint8Array(seed.buffer, address, length)
  const seenDataView = new DataView(seed.buffer, address, length)
  binding.getInfoOutputs(seenView)
  binding.getInfoOutputs(seenDataView)
  assert.ok(memory, 'found the wasm memory')

  const cases = [
    ['emnapi view, get-info', () => binding.staticBuffer(), view => binding.getInfoOutputs(view)],
    ['seen view, get-info', () => seenView, view => binding.getInfoOutputs(view)],
    ['seen DataView, get-info', () => seenDataView, view => binding.getInfoOutputs(view)]
  ]
  // emnapi's JS API (the shouldCopy=false path); the emscripten builds of this
  // target do not export it
  const emnapi = loadPromise.Module.emnapi
  if (emnapi) {
    cases.push(
      ['emnapi view, syncMemory', () => binding.staticBuffer(), view => emnapi.syncMemory(false, view)],
      ['seen view, syncMemory', () => seenView, view => emnapi.syncMemory(false, view)]
    )
  }
  for (const [name, getView, call] of cases) {
    const first = getView()
    reads = 0
    growAfter = 0
    call(first)
    const total = reads
    assert.ok(total > 0, `${name}: reads memory.buffer`)
    for (let n = 1; n <= total; n++) {
      const view = getView()
      const byteLength = getBuffer.call(memory).byteLength
      reads = 0
      growAfter = n
      let result
      try {
        result = call(view)
      } finally {
        growAfter = 0
      }
      const where = `${name}, grow(1) after read ${n} of ${total}`
      // only the test's own page: emnapi did not copy the wasm memory
      assert.strictEqual(getBuffer.call(memory).byteLength, byteLength + 65536, `${where}: emnapi copied the wasm memory`)
      if (result && 'data' in result) {
        assert.strictEqual(result.data, address, `${where}: data is not the view's address`)
        assert.strictEqual(result.byteOffset, address, `${where}: byteOffset`)
        assert.strictEqual(result.length, length, `${where}: length`)
      }
    }
  }
})
