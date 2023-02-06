const path = require('path')
const fs = require('fs')
const { spawn } = require('../../../script/spawn.js')
const { which } = require('../../../script/which.js')

async function main () {
  const buildDir = path.join(__dirname, '../.cgenbuild')
  const cwd = path.join(__dirname, '..')

  fs.rmSync(buildDir, { force: true, recursive: true })
  fs.mkdirSync(buildDir, { recursive: true })
  let LLVM_PATH = process.env.LLVM_PATH
  if (!LLVM_PATH) {
    throw new Error('process.env.LLVM_PATH is falsy value')
  }
  if (!path.isAbsolute(LLVM_PATH)) {
    LLVM_PATH = path.join(__dirname, '../../..', LLVM_PATH)
  }
  LLVM_PATH = LLVM_PATH.replace(/\\/g, '/')

  await spawn('cmake', [
    ...(
      which('ninja')
        ? ['-G', 'Ninja']
        : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])
    ),
    `-DCMAKE_TOOLCHAIN_FILE=${path.join(__dirname, '../../emnapi/cmake/wasm.cmake').replace(/\\/g, '/')}`,
    `-DLLVM_PREFIX=${LLVM_PATH}`,
    `-DCMAKE_BUILD_TYPE=${process.argv[2] || 'Debug'}`,
    // '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-H.',
    '-B', buildDir
  ], cwd)

  await spawn('cmake', [
    '--build',
    buildDir
  ], cwd)
}

main()
