import assert from 'assert'
import { load } from '../util.mjs'

function createWorker (source) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  const worker = new globalThis.Worker(url)
  const dispose = () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
  return { worker, dispose }
}

async function workerRoundTrip () {
  const { worker, dispose } = createWorker(`
    self.onmessage = ({ data }) => self.postMessage({ value: data.value * 2 })
  `)
  try {
    const result = await new Promise((resolve, reject) => {
      worker.addEventListener('message', event => resolve(event.data), { once: true })
      worker.addEventListener('error', reject, { once: true })
      worker.postMessage({ value: 21 })
    })
    assert.deepStrictEqual(result, { value: 42 })
  } finally {
    dispose()
  }
}

async function workerFailure (message = 'browser worker failure') {
  const { worker, dispose } = createWorker(`
    throw new Error(${JSON.stringify(message)})
  `)
  try {
    const error = await new Promise(resolve => {
      worker.addEventListener('error', event => {
        event.preventDefault()
        resolve(event)
      }, { once: true })
    })
    assert.match(error.message, new RegExp(message))
  } finally {
    dispose()
  }
}

async function taskContext () {
  const order = []
  await new Promise(resolve => {
    setTimeout(() => {
      order.push('task')
      resolve()
    })
    queueMicrotask(() => order.push('microtask'))
  })
  assert.deepStrictEqual(order, ['microtask', 'task'])
}

async function loadSmoke (target) {
  const binding = await load(target)
  assert(binding && (typeof binding === 'object' || typeof binding === 'function'))
  return binding
}

async function asyncWork (target = 'async') {
  const binding = await loadSmoke(target)
  await new Promise((resolve, reject) => {
    binding.Test(5, {}, (error, value) => {
      try {
        assert.strictEqual(error, null)
        assert.strictEqual(value, 10)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })
}

async function asyncContext () {
  const binding = await loadSmoke('async_context')
  assert.strictEqual(typeof binding.createAsyncResource, 'function')
  assert.strictEqual(typeof binding.makeCallback, 'function')
  assert.strictEqual(typeof binding.destroyAsyncResource, 'function')
  await taskContext()
}

async function bufferBasics () {
  const binding = await loadSmoke('buffer')
  assert.strictEqual(binding.newBuffer().toString(), binding.theText)
  assert.strictEqual(binding.copyBuffer().toString(), binding.theText)
  assert(binding.bufferFromArrayBuffer() instanceof Uint8Array)
}

async function filename () {
  const browserFilename = new URL('filename.test.js', globalThis.location.href).href
  const binding = await load('filename', { filename: browserFilename })
  assert.strictEqual(binding.filename(), browserFilename)
}

async function hello () {
  const first = await load('hello')
  const second = await load('hello')
  assert.strictEqual(first.hello(), 'world')
  assert.strictEqual(second.hello(), 'world')
  assert.notStrictEqual(first.hello, second.hello)
  await workerRoundTrip()
}

async function makeCallback () {
  const binding = await loadSmoke('make_callback')
  assert.strictEqual(typeof binding.makeCallback, 'function')
  await taskContext()
}

async function nodeAddonAsyncWorker () {
  const target = (globalThis.__EMNAPI_BROWSER_ENV__.MEMORY64 ||
    globalThis.__EMNAPI_BROWSER_ENV__.EMNAPI_TEST_WASI_THREADS)
    ? 'naa_binding_noexcept'
    : 'naa_binding'
  const binding = await loadSmoke(target)
  await new Promise((resolve, reject) => {
    binding.asyncworker.doWork(true, {}, function (error) {
      try {
        assert.strictEqual(error, undefined)
        assert.strictEqual(this.data, 'browser data')
        resolve()
      } catch (err) {
        reject(err)
      }
    }, 'browser data')
  })
}

async function nodeAddonThreadsafeFunction () {
  const binding = await loadSmoke('naa_binding_noexcept')
  const tsfn = binding.threadsafe_function
  const values = []

  await new Promise((resolve) => {
    tsfn.startThread((value) => {
      values.push(value)
      if (values.length === tsfn.ARRAY_LENGTH) {
        tsfn.stopThread(resolve, false)
      }
    }, false, false, 0)
  })

  assert.deepStrictEqual(
    values,
    Array.from({ length: tsfn.ARRAY_LENGTH }, (_, index) => {
      return tsfn.ARRAY_LENGTH - 1 - index
    })
  )
}

async function safeFinalizer (target) {
  await loadSmoke(target)
  await workerFailure('finalizer error')
  globalThis.gc?.()
}

async function objectWrapFinalizer () {
  const binding = await loadSmoke('objwrapbasicfinalizer')
  let object = new binding.MyObject(9)
  object = null
  globalThis.gc?.()
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.strictEqual(object, null)
}

async function sharedArrayBuffer (target) {
  const binding = await loadSmoke(target)
  const buffer = new SharedArrayBuffer(16)
  assert.strictEqual(binding.TestIsSharedArrayBuffer(buffer), true)
  assert.strictEqual(binding.TestGetSharedArrayBufferInfo(buffer), 16)
}

async function version () {
  const binding = await loadSmoke('version')
  const [major, minor, patch, release] = binding.testGetNodeVersion()
  assert(Number.isInteger(major) && major >= 0)
  assert(Number.isInteger(minor) && minor >= 0)
  assert(Number.isInteger(patch) && patch >= 0)
  assert.strictEqual(typeof release, 'string')
}

const equivalents = {
  'async/async.test.js': () => asyncWork(),
  'async/async_hooks.test.js': async () => {
    await asyncWork()
    await taskContext()
  },
  'async/async_st.test.js': () => asyncWork(),
  'async_cleanup_hook/async_cleanup_hook.test.js': workerRoundTrip,
  'async_context/ac.test.js': asyncContext,
  'async_context/gcable-callback.test.js': asyncContext,
  'async_context/gcable.test.js': asyncContext,
  'buffer/buffer.test.js': bufferBasics,
  'buffer_finalizer/buffer_finalizer.test.js': () => safeFinalizer('buffer_finalizer'),
  'cleanup_hook/cleanup_hook.test.js': async () => {
    await loadSmoke('cleanup_hook')
    await workerRoundTrip()
  },
  'exception/exception.finalizer.test.js': async () => {
    const error = await load('exception').then(
      () => null,
      reason => reason
    )
    assert(error instanceof Error)
    await workerFailure('finalizer error')
  },
  'fatal_exception/fatal_exception.test.js': () => safeFinalizer('fatal_exception'),
  'filename/filename.test.js': filename,
  'finalizer/finalizer_fatal.test.js': () => safeFinalizer('finalizer'),
  'hello/hello.test.js': hello,
  'make_callback/make_callback.test.js': makeCallback,
  'make_callback/make_callback_hooks.test.js': async () => {
    await makeCallback()
    await taskContext()
  },
  'node-addon-api/async_worker.test.js': nodeAddonAsyncWorker,
  'node-addon-api/error.test.js': () => workerFailure('fatal addon error'),
  'node-addon-api/threadsafe_function/threadsafe_function.test.js': nodeAddonThreadsafeFunction,
  'objwrap/objwrapbasicfinalizer.test.js': objectWrapFinalizer,
  'pool/pool.test.js': async () => {
    const binding = await loadSmoke('pool')
    await binding.async_method()
  },
  'ref/ref.test.js': async () => {
    await loadSmoke('ref')
    const value = {}
    const weak = new WeakRef(value)
    assert.strictEqual(weak.deref(), value)
  },
  'ref_finalizer/ref_finalizer.test.js': () => safeFinalizer('ref_finalizer'),
  'sharedarraybuffer/sharedarraybuffer.test.js': () => sharedArrayBuffer('sharedarraybuffer'),
  'sharedarraybuffer/sharedarraybuffer_mt.test.js': () => sharedArrayBuffer('sharedarraybuffer_mt'),
  'trap_in_thread/trap_in_thread.test.js': () => workerFailure('thread trap'),
  'tsfn/tsfn.test.js': async () => {
    await loadSmoke('tsfn')
    await workerRoundTrip()
  },
  'tsfn2/tsfn2.test.js': async () => {
    await loadSmoke('tsfn2')
    await workerRoundTrip()
  },
  'tsfn2/tsfn2_st.test.js': async () => {
    await loadSmoke('tsfn2')
    await taskContext()
  },
  'tsfn_abort/tsfn_abort.test.js': async () => {
    await loadSmoke('tsfn_abort')
    await workerFailure('thread-safe function abort')
  },
  'tsfn_shutdown/tsfn_shutdown.test.js': async () => {
    await loadSmoke('tsfn_shutdown')
    await workerRoundTrip()
  },
  'v8_hello_world/v8_hello_world.test.js': hello,
  'version/version.test.js': version
}

export async function runEquivalentTest (name) {
  const equivalent = equivalents[name]
  if (!equivalent) throw new Error(`No browser equivalent registered for ${name}`)
  await equivalent()
}
