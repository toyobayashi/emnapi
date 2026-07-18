'use strict'

// Child helper for buffer.test.js (not a test file itself).
//
// Simulates a hidden-global environment (issue #143): the SharedArrayBuffer
// global is removed BEFORE emnapi loads, while the engine still hands out
// genuine SABs — a shared WebAssembly.Memory buffer is one regardless of the
// global. napi_get_arraybuffer_info on it must still succeed.
//
// This scenario is single-threaded by construction: on a threaded (shared
// wasm memory) build the worker bootstrap itself needs the global, so the
// parent only spawns this child on non-shared builds.
delete globalThis.SharedArrayBuffer

const assert = require('assert')

// the engine can still create genuine SABs without the global
const sharedMemory = new WebAssembly.Memory({ initial: 1, maximum: 4, shared: true })
const sab = sharedMemory.buffer
assert.strictEqual(typeof SharedArrayBuffer, 'undefined', 'the global must stay hidden')
assert.strictEqual(
  Object.prototype.toString.call(sab),
  '[object SharedArrayBuffer]',
  'precondition: the shared memory buffer must be a genuine SAB'
)

const { load } = require('../util')

load('buffer').then((binding) => {
  const r = binding.getArrayBufferInfoOutputs(sab)
  assert.strictEqual(r.status, 0 /* napi_ok */, 'napi_get_arraybuffer_info must accept a genuine SAB in a hidden-global realm')
  assert.strictEqual(r.byteLength, sab.byteLength)
  console.log('hidden-sab-global OK')
  process.exit(0)
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
