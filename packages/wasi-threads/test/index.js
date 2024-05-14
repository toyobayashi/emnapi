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

  console.log('-------- command --------')
  await run('main.wasm')
  console.log('-------- reactor --------')
  await run('lib.wasm')
})
