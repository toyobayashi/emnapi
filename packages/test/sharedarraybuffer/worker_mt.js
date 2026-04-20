'use strict'
const { parentPort } = require('worker_threads')

const registry = new FinalizationRegistry((ctx) => {
  const view = new Int32Array(ctx.wasmMemoryBuffer, ctx.metaPtr, 1)
  Atomics.sub(view, 0, 1)
})

parentPort.on('message', (msg) => {
  const handle = msg.handle
  const wasmMemoryBuffer = msg.wasmMemoryBuffer
  const refcountView = new Int32Array(wasmMemoryBuffer, handle, 1)

  // Acquire: increment refcount and register for release on GC
  Atomics.add(refcountView, 0, 1)
  registry.register(msg.sab, { wasmMemoryBuffer, metaPtr: handle })

  // Drop reference to SAB (the handler scope keeps msg alive until we exit)
  msg.sab = null

  // Use setTimeout to exit the handler scope so V8 can GC the SAB
  setTimeout(() => {
    let attempts = 0
    const maxAttempts = 50
    const poll = () => {
      global.gc()
      if (Atomics.load(refcountView, 0) === 1 || attempts >= maxAttempts) {
        parentPort.postMessage({ type: 'done' })
      } else {
        attempts++
        setTimeout(poll, 20)
      }
    }
    poll()
  }, 10)
})
