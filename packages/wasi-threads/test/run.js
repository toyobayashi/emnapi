export async function main (WASI, WASIThreads, Worker, process, workerSource) {
  async function run (file) {
    const wasi = new WASI({
      version: 'preview1',
      args: [file, 'node'],
      env: process.env
    })
    const wasiThreads = new WASIThreads({
      wasi,
      onCreateWorker: ({ name }) => {
        return new Worker(new URL(workerSource, import.meta.url), {
          type: 'module',
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
      const { readFileSync } = await import('fs')
      input = readFileSync(new URL(file, import.meta.url))
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
}

export function child (WASI, ThreadMessageHandler, WASIThreads) {
  const handler = new ThreadMessageHandler({
    async onLoad ({ wasmModule, wasmMemory }) {
      const wasi = new WASI({
        version: 'preview1'
      })

      const wasiThreads = new WASIThreads({
        wasi,
        childThread: true
      })

      const originalInstance = await WebAssembly.instantiate(wasmModule, {
        env: {
          memory: wasmMemory,
          print_string: function (ptr) {
            const HEAPU8 = new Uint8Array(wasmMemory.buffer)
            let len = 0
            while (HEAPU8[ptr + len] !== 0) len++
            const string = new TextDecoder().decode(HEAPU8.slice(ptr, ptr + len))
            console.log(string)
          }
        },
        ...wasi.getImportObject(),
        ...wasiThreads.getImportObject()
      })

      const instance = wasiThreads.initialize(originalInstance, wasmModule, wasmMemory)

      return { module: wasmModule, instance }
    }
  })

  globalThis.onmessage = function (e) {
    handler.handle(e)
    // handle other messages
  }
}
