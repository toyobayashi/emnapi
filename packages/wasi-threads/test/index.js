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
    }

    const nodeWasi = { WASI: globalThis.wasmUtil.WASI }
    const nodePath = {
      join: function () {
        return Array.prototype.join.call(arguments, '/')
      }
    }
    const nodeWorkerThreads = {
      Worker: class MainThreadWorker {
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
})(function (require, process, __dirname) {
  const { WASI } = require('node:wasi')
  const { WASIThreads } = require('@emnapi/wasi-threads')
  const { Worker } = require('node:worker_threads')
  const { join } = require('node:path')

  const ExecutionModel = {
    Command: 'command',
    Reactor: 'reactor'
  }

  async function run (model = ExecutionModel.Reactor) {
    const file = model === ExecutionModel.Command ? 'main.wasm' : 'lib.wasm'
    const wasi = new WASI({
      version: 'preview1',
      args: [file, 'node'],
      env: process.env
    })
    const wasiThreads = new WASIThreads({
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
    wasiThreads.patchWasiInstance(wasi)
    const memory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
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
    const { module, instance } = await WebAssembly.instantiate(input, {
      env: {
        memory
      },
      ...wasi.getImportObject(),
      ...wasiThreads.getImportObject()
    })

    wasiThreads.setup(instance, module, memory)
    if (model === ExecutionModel.Command) {
      const code = wasi.start(instance)
      // wasiThreads.terminateAllThreads()
      return code
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
    process.exit(1)
  })
})
