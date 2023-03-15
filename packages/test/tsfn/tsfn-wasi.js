/* eslint-disable no-undef */
/* eslint-disable camelcase */
if (typeof self !== 'undefined') {
  importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
  importScripts('../../core/dist/emnapi-core.js')
  importScripts('../../runtime/dist/emnapi.js')
}

(async function main () {
  const init = function () {
    const { WASI } = wasmUtil
    const { createNapiModule, loadNapiModule } = emnapiCore
    const { getDefaultContext } = emnapi
    const wasi = new WASI()
    const napiModule = createNapiModule({
      context: getDefaultContext(),
      onCreateWorker () {
        return new Worker('../worker.js')
      }
    })
    const wasmMemory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })

    const p = new Promise((resolve, reject) => {
      loadNapiModule(napiModule, '../.cgenbuild/Debug/tsfn.wasm', {
        wasi,
        overwriteImports (importObject) {
          importObject.env.memory = wasmMemory
        }
      }).then(() => {
        resolve(napiModule.exports)
      }).catch(reject)
    })
    p.Module = napiModule
    return p
  }
  const binding = await init()

  const assert = {
    strictEqual (a, b) {
      if (a !== b) {
        throw new Error('')
      }
    },
    deepStrictEqual (a, b) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error('')
      }
    }
  }

  const common = {
    mustCall (f) { return f }
  }

  const setImmediate = globalThis.setImmediate || function (f) {
    const channel = new MessageChannel()
    channel.port1.onmessage = function () {
      channel.port1.onmessage = null
      f()
    }
    channel.port2.postMessage(null)
  }

  const expectedArray = (function (arrayLength) {
    const result = []
    for (let index = 0; index < arrayLength; index++) {
      result.push(arrayLength - 1 - index)
    }
    return result
  })(binding.ARRAY_LENGTH)

  function testWithJSMarshaller ({
    threadStarter,
    quitAfter,
    abort,
    maxQueueSize,
    launchSecondary
  }) {
    return new Promise((resolve) => {
      const array = []
      if (abort) console.log('start', { threadStarter, maxQueueSize })
      binding[threadStarter](function testCallback (value) {
        array.push(value)
        if (array.length === quitAfter) {
          Promise.resolve().then(() => {
            if (abort) console.log('stop', { threadStarter, maxQueueSize })
            binding.StopThread(common.mustCall(() => {
              if (abort) console.log('stopCallback', { threadStarter, maxQueueSize }, '\n')
              resolve(array)
            }), !!abort)
          })
        }
      }, !!abort, !!launchSecondary, maxQueueSize)
      if (threadStarter === 'StartThreadNonblocking') {
        // Let's make this thread really busy for a short while to ensure that
        // the queue fills and the thread receives a napi_queue_full.
        const start = Date.now()
        while (Date.now() - start < 200);
      }
    })
  }

  // function testUnref (queueSize) {
  //   return new Promise((resolve, reject) => {
  //     let output = ''
  //     const child = fork(__filename, ['child', queueSize], {
  //       stdio: [process.stdin, 'pipe', process.stderr, 'ipc']
  //     })
  //     child.on('close', (code) => {
  //       if (code === 0) {
  //         resolve(output.match(/\S+/g))
  //       } else {
  //         reject(new Error('Child process died with code ' + code))
  //       }
  //     })
  //     child.stdout.on('data', (data) => (output += data.toString()))
  //   })
  //     .then((result) => assert.strictEqual(result.indexOf(0), -1))
  // }

  // eslint-disable-next-line no-new
  await new Promise(function testWithoutJSMarshaller (resolve) {
    let callCount = 0
    binding.StartThreadNoNative(function testCallback () {
      callCount++

      // The default call-into-JS implementation passes no arguments.
      assert.strictEqual(arguments.length, 0)
      if (callCount === binding.ARRAY_LENGTH) {
        setImmediate(() => {
          binding.StopThread(common.mustCall(() => {
            resolve()
          }), false)
        })
      }
    }, false /* abort */, false /* launchSecondary */, binding.MAX_QUEUE_SIZE)
  })

    // Start the thread in blocking mode, and assert that all values are passed.
    // Quit after it's done.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      quitAfter: binding.ARRAY_LENGTH
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode, and assert that all values are passed.
    // Quit after it's done.
    // Doesn't pass the callback js function to napi_create_threadsafe_function.
    // Instead, use an alternative reference to get js function called.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNoJsFunc',
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      quitAfter: binding.ARRAY_LENGTH
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode with an infinite queue, and assert that all
    // values are passed. Quit after it's done.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      maxQueueSize: 0,
      quitAfter: binding.ARRAY_LENGTH
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in non-blocking mode, and assert that all values are passed.
    // Quit after it's done.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNonblocking',
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      quitAfter: binding.ARRAY_LENGTH
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode, and assert that all values are passed.
    // Quit early, but let the thread finish.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      quitAfter: 1
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode with an infinite queue, and assert that all
    // values are passed. Quit early, but let the thread finish.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      maxQueueSize: 0,
      quitAfter: 1
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in non-blocking mode, and assert that all values are passed.
    // Quit early, but let the thread finish.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNonblocking',
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      quitAfter: 1
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode, and assert that all values are passed.
    // Quit early, but let the thread finish. Launch a secondary thread to test the
    // reference counter incrementing functionality.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      quitAfter: 1,
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      launchSecondary: true
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in non-blocking mode, and assert that all values are passed.
    // Quit early, but let the thread finish. Launch a secondary thread to test the
    // reference counter incrementing functionality.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNonblocking',
      quitAfter: 1,
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      launchSecondary: true
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))

    // Start the thread in blocking mode, and assert that it could not finish.
    // Quit early by aborting.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      quitAfter: 1,
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      abort: true
    }))
    .then((result) => assert.strictEqual(result.indexOf(0), -1))

    // Start the thread in blocking mode with an infinite queue, and assert that it
    // could not finish. Quit early by aborting.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThread',
      quitAfter: 1,
      maxQueueSize: 0,
      abort: true
    }))
    .then((result) => assert.strictEqual(result.indexOf(0), -1))

    // Start the thread in non-blocking mode, and assert that it could not finish.
    // Quit early and aborting.
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNonblocking',
      quitAfter: 1,
      maxQueueSize: binding.MAX_QUEUE_SIZE,
      abort: true
    }))
    .then((result) => assert.strictEqual(result.indexOf(0), -1))

    // Make sure that threadsafe function isn't stalled when we hit
    // `kMaxIterationCount` in `src/node_api.cc`
    .then(() => testWithJSMarshaller({
      threadStarter: 'StartThreadNonblocking',
      maxQueueSize: binding.ARRAY_LENGTH >>> 1,
      quitAfter: binding.ARRAY_LENGTH
    }))
    .then((result) => assert.deepStrictEqual(result, expectedArray))
})()
