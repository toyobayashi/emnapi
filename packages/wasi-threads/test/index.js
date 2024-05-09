const fs = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { Worker } = require('node:worker_threads')
const { WASI } = require('wasi')
const { WASIThreads, ThreadManager, ExecutionModel } = require('..')

function build (model = ExecutionModel.Reactor) {
  const bin = join(process.env.WASI_SDK_PATH, 'bin', 'clang') + (process.platform === 'win32' ? '.exe' : '')
  const args = [
    '-o', join(__dirname, model === ExecutionModel.Command ? 'main.wasm' : 'lib.wasm'),
    '-mbulk-memory',
    '-matomics',
    `-mexec-model=${model}`,
    ...(model === ExecutionModel.Command
      ? [
          '-D__WASI_COMMAND__=1'
        ]
      : [
          '-Wl,--no-entry'
        ]
    ),
    '--target=wasm32-wasi-threads',
    // '-O3',
    '-g',
    '-pthread',
    '-Wl,--import-memory',
    '-Wl,--shared-memory',
    '-Wl,--export-memory',
    '-Wl,--export-dynamic',
    '-Wl,--max-memory=2147483648',
    '-Wl,--export=malloc,--export=free',
    join(__dirname, 'main.c')
  ]
  console.log(`> "${bin}" ${args.map(s => s.includes(' ') ? `"${s}"` : s).join(' ')}`)
  spawnSync(bin, args, {
    stdio: 'inherit',
    env: process.env
  })
}

function run (model = ExecutionModel.Reactor) {
  const wasi = new WASI({
    version: 'preview1',
    env: process.env
  })
  const wasiThreads = new WASIThreads({
    threadManager: new ThreadManager({
      printErr: console.error.bind(console),
      onCreateWorker: ({ name }) => {
        return new Worker(join(__dirname, 'worker.js'), {
          name,
          workerData: {
            name,
            model
          },
          env: process.env,
          execArgv: ['--experimental-wasi-unstable-preview1']
        })
      }
    })
  })
  const memory = new WebAssembly.Memory({
    initial: 16777216 / 65536,
    maximum: 2147483648 / 65536,
    shared: true
  })
  const file = join(__dirname, model === ExecutionModel.Command ? 'main.wasm' : 'lib.wasm')
  return WebAssembly.instantiate(fs.readFileSync(file), {
    env: {
      memory
    },
    ...wasi.getImportObject(),
    ...wasiThreads.getImportObject()
  }).then(({ module, instance }) => {
    wasiThreads.setup(instance, module, memory)
    if (model === ExecutionModel.Command) {
      return wasi.start(instance)
    } else {
      wasi.initialize(instance)
      return instance.exports.fn()
    }
  })
}

async function main () {
  build(ExecutionModel.Command)
  build(ExecutionModel.Reactor)
  console.log('-------- command --------')
  await run(ExecutionModel.Command)
  console.log('-------- reactor --------')
  await run(ExecutionModel.Reactor)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
