const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const ExecutionModel = {
  Command: 'command',
  Reactor: 'reactor'
}

function build (model) {
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
  const quote = s => s.includes(' ') ? `"${s}"` : s
  console.log(`> ${quote(bin)} ${args.map(quote).join(' ')}`)
  spawnSync(bin, args, {
    stdio: 'inherit',
    env: process.env
  })
}

build(ExecutionModel.Command)
build(ExecutionModel.Reactor)
