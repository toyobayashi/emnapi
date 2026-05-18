// This file is used in both main thread and worker thread,
// but worker module does not support import map, so we import the full path
// equivalent to `import * as emnapiCore from '@emnapi/core'` with bundler
import * as emnapiCore from './node_modules/@emnapi/core/dist/emnapi-core.full.js'

const ENVIRONMENT_IS_NODE = typeof process !== 'undefined' && process.versions && process.versions.node
const EMNAPI_WORKER_NAME = 'emnapi-worker'

async function getFs () {
  if (ENVIRONMENT_IS_NODE) {
    return (await import('node:fs'))
  }
  if (!globalThis.fs) {
    globalThis.fs = (async function () {
      const { Buffer } = await import('https://esm.sh/buffer@6.0.3')
      globalThis.Buffer = Buffer
      const memfs = await import('../../node_modules/memfs-browser/dist/memfs.esm.js')
      const { Volume, createFsFromVolume } = memfs
      return createFsFromVolume(Volume.fromJSON({
        '/': null
      }))
    })()
  }
  return globalThis.fs
}

async function getWasi () {
  return ENVIRONMENT_IS_NODE ? (await import('node:wasi')).WASI : (await import('../../node_modules/@tybys/wasm-util/dist/wasm-util.esm.js')).WASI
}

async function getWorker () {
  return ENVIRONMENT_IS_NODE ? (await import('worker_threads')).Worker : globalThis.Worker
}

export default async function init (url, options) {
  const WASI = await getWasi()
  const Worker = await getWorker()
  const fs = await getFs()

  function fetchWasm () {
    if (ENVIRONMENT_IS_NODE) {
      return fs.promises.readFile(url)
    }
    return fetch(url)
  }

  return emnapiCore.instantiateNapiModule(fetchWasm(), {
    reuseWorker: {
      size: 4,
      strict: true
    },
    wasi: new WASI({
      version: 'preview1',
      fs
    }),
    waitThreadStart: ENVIRONMENT_IS_NODE ? 1000 : false,
    overwriteImports (importObject) {
      importObject.env.memory = new WebAssembly.Memory({
        initial: 16777216 / 65536,
        maximum: 4294967296 / 65536,
        shared: true
      })
    },
    onCreateWorker: () => {
      if (ENVIRONMENT_IS_NODE) {
        return new Worker(import.meta.filename, {
          type: 'module',
          env: process.env,
          execArgv: ['--experimental-wasi-unstable-preview1'],
          name: EMNAPI_WORKER_NAME,
          workerData: {
            name: EMNAPI_WORKER_NAME,
          }
        })
      }
      return new Worker(import.meta.url, {
        type: 'module',
        name: EMNAPI_WORKER_NAME,
      })
    },
    ...options
  })
}

function createMessageHandler () {
  const ready = (async function () {
    if (ENVIRONMENT_IS_NODE) {
      let parentPort
      Object.assign(globalThis, {
        postMessage: function (msg) {
          parentPort?.postMessage(msg)
        },
      })

      parentPort = (await import('worker_threads')).parentPort

      parentPort.on('message', (data) => {
        globalThis.onmessage?.({ data })
      })
    }
    return { fs: await getFs(), WASI: await getWasi() }
  })()

  return new emnapiCore.MessageHandler({
    async onLoad ({ wasmModule, wasmMemory }) {
      const { fs, WASI } = await ready
      const wasi = new WASI({
        version: 'preview1',
        fs,
      })

      return emnapiCore.instantiateNapiModule(wasmModule, {
        childThread: true,
        wasi,
        overwriteImports (importObject) {
          importObject.env.memory = wasmMemory
        }
      })
    }
  })
}

async function main () {
  const isChildThread = ENVIRONMENT_IS_NODE
    ? !(await import('worker_threads')).isMainThread && (await import('worker_threads')).workerData.name === EMNAPI_WORKER_NAME
    : (typeof window === 'undefined' && typeof importScripts !== 'undefined' && globalThis.name === EMNAPI_WORKER_NAME)

  if (isChildThread) {
    const handler = createMessageHandler()

    // MUST synchronously set globalThis.onmessage on web platform
    globalThis.onmessage = function (e) {
      handler.handle(e)
      // handle other messages
    }
  }
}

main()
