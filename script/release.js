const fs = require('fs')
const path = require('path')
const crossZip = require('@tybys/cross-zip')
const { which } = require('./which.js')
const { spawn } = require('./spawn.js')

async function main () {
  const sysroot = path.join(__dirname, '../out')

  fs.rmSync(sysroot, { force: true, recursive: true })
  fs.mkdirSync(sysroot, { recursive: true })

  let WASI_SDK_PATH = process.env.WASI_SDK_PATH
  if (!WASI_SDK_PATH) {
    throw new Error('process.env.WASI_SDK_PATH is falsy value')
  }
  if (!path.isAbsolute(WASI_SDK_PATH)) {
    WASI_SDK_PATH = path.join(__dirname, '..', WASI_SDK_PATH)
  }
  const wasiSdkPath = WASI_SDK_PATH
  WASI_SDK_PATH = WASI_SDK_PATH.replace(/\\/g, '/')

  const cwd = path.join(__dirname, '../packages/emnapi')
  let emcmake = process.platform === 'win32' ? 'emcmake.bat' : 'emcmake'
  if (process.env.EMSDK) {
    emcmake = path.join(process.env.EMSDK, 'upstream/emscripten', emcmake)
  }

  const generatorOptions = which('ninja')
    ? ['-G', 'Ninja']
    : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])

  await spawn('cmake', [
    ...generatorOptions,
    `-DCMAKE_TOOLCHAIN_FILE=${WASI_SDK_PATH}/share/cmake/wasi-sdk.cmake`,
    `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-H.',
    '-Bbuild/wasm32-wasi'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build/wasm32-wasi'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/wasm32-wasi',
    '--prefix',
    sysroot
  ], cwd)

  if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-pthread.cmake'))) {
    await spawn('cmake', [
      ...generatorOptions,
      `-DCMAKE_TOOLCHAIN_FILE=${WASI_SDK_PATH}/share/cmake/wasi-sdk-pthread.cmake`,
      `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
      '-DCMAKE_BUILD_TYPE=Release',
      '-DCMAKE_VERBOSE_MAKEFILE=1',
      '-H.',
      '-Bbuild/wasm32-wasi-threads'
    ], cwd)

    await spawn('cmake', [
      '--build',
      'build/wasm32-wasi-threads'
    ], cwd)

    await spawn('cmake', [
      '--install',
      'build/wasm32-wasi-threads',
      '--prefix',
      sysroot
    ], cwd)
  }

  await spawn(emcmake, [
    'cmake',
    ...generatorOptions,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-DEMNAPI_INSTALL_SRC=1',
    '-H.',
    '-Bbuild/emscripten'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build/emscripten'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/emscripten',
    '--prefix',
    sysroot
  ], cwd)

  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.min.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.d.ts'), path.join(sysroot, 'lib/emnapi', 'emnapi.d.ts'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.js'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.min.js'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.d.ts'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.d.ts'))

  crossZip.zipSync(sysroot, path.join(__dirname, 'emnapi.zip'))
  // fs.rmSync(sysroot, { force: true, recursive: true })
}

main()
