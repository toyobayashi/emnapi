const path = require('path')
const fs = require('fs')
const { spawn } = require('../../../script/spawn.js')
const { which } = require('../../../script/which.js')

async function main () {
  const buildDir = path.join(__dirname, '../.cgenbuild')
  const cwd = path.join(__dirname, '..')

  fs.rmSync(buildDir, { force: true, recursive: true })
  fs.mkdirSync(buildDir, { recursive: true })
  let WASI_SDK_PATH = process.env.WASI_SDK_PATH
  if (!WASI_SDK_PATH) {
    throw new Error('process.env.WASI_SDK_PATH is falsy value')
  }
  if (!path.isAbsolute(WASI_SDK_PATH)) {
    WASI_SDK_PATH = path.join(__dirname, '../../..', WASI_SDK_PATH)
  }
  WASI_SDK_PATH = WASI_SDK_PATH.replace(/\\/g, '/')

  await spawn('cmake', [
    ...(
      which('ninja')
        ? ['-G', 'Ninja']
        : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])
    ),
    `-DCMAKE_TOOLCHAIN_FILE=${WASI_SDK_PATH}/share/cmake/wasi-sdk-pthread.cmake`,
    `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
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
