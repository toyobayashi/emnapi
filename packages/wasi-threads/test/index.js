(function () {
  const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string'

  let Worker, WASI, WASIThreads
  if (ENVIRONMENT_IS_NODE) {
    const nodeWorkerThreads = require('worker_threads')
    Worker = nodeWorkerThreads.Worker
    WASI = require('node:wasi').WASI
    WASIThreads = require('..').WASIThreads
  } else {
    if (typeof importScripts === 'function') {
      globalThis.Worker = class MyWorker {
        constructor (url, options) {
          this.id = String(Math.random())
          self.addEventListener('message', ({ data }) => {
            if (data.type === 'onmessage' && data.payload.id === this.id) {
              this.onmessage?.({ data: data.payload.data })
            }
          })
          postMessage({
            type: 'new',
            payload: {
              id: this.id,
              url,
              options
            }
          })
        }

        postMessage (data) {
          postMessage({
            type: 'postMessage',
            payload: {
              id: this.id,
              data
            }
          })
        }

        terminate () {
          postMessage({
            type: 'terminate',
            payload: {
              id: this.id
            }
          })
        }
      }
      // eslint-disable-next-line no-undef
      importScripts('../../../node_modules/@tybys/wasm-util/dist/wasm-util.min.js')
      // eslint-disable-next-line no-undef
      importScripts('../dist/wasi-threads.js')
    }
    Worker = globalThis.Worker
    WASI = globalThis.wasmUtil.WASI
    WASIThreads = globalThis.wasiThreads.WASIThreads
  }

  const ExecutionModel = {
    Command: 'command',
    Reactor: 'reactor'
  }

  async function run (model = ExecutionModel.Reactor) {
    const file = model === ExecutionModel.Command ? 'main.wasm' : 'lib.wasm'
    const wasi = new WASI({
      version: 'preview1',
      args: [file, 'node'],
      ...(ENVIRONMENT_IS_NODE ? { env: process.env } : {})
    })
    const wasiThreads = new WASIThreads({
      onCreateWorker: ({ name }) => {
        const workerjs = ENVIRONMENT_IS_NODE
          ? require('node:path').join(__dirname, 'worker.js')
          : './worker.js'
        return new Worker(workerjs, {
          name,
          workerData: {
            name
          },
          ...(ENVIRONMENT_IS_NODE ? { env: process.env } : {}),
          execArgv: ['--experimental-wasi-unstable-preview1']
        })
      },
      // optional
      waitThreadStart: true
    })
    const memory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })
    let input
    if (ENVIRONMENT_IS_NODE) {
      input = require('node:fs').readFileSync(require('node:path').join(__dirname, file))
    } else {
      const response = await fetch(file)
      input = await response.arrayBuffer()
    }
    const { module, instance } = await WebAssembly.instantiate(input, {
      env: {
        memory
      },
      ...wasi.getImportObject(),
      ...wasiThreads.getImportObject()
    })

    wasiThreads.setup(instance, module, memory)
    if (model === ExecutionModel.Command) {
      return wasi.start(instance)
    } else {
      wasi.initialize(instance)
      return instance.exports.fn(1)
    }
  }

  async function main () {
    console.log('-------- command --------')
    await run(ExecutionModel.Command)
    console.log('-------- reactor --------')
    await run(ExecutionModel.Reactor)
  }

  main().catch(err => {
    console.error(err)
    if (ENVIRONMENT_IS_NODE) {
      process.exit(1)
    }
  })
})()
