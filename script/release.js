const fs = require('fs-extra')
const path = require('path')
const crossZip = require('@tybys/cross-zip')
const { which } = require('./which.js')
const { spawn, spawnSync } = require('./spawn.js')

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

  let LLVM_PATH = process.env.LLVM_PATH
  if (!LLVM_PATH) LLVM_PATH = process.env.WASI_SDK_PATH
  if (!path.isAbsolute(LLVM_PATH)) {
    LLVM_PATH = path.join(__dirname, '..', LLVM_PATH)
  }
  LLVM_PATH = LLVM_PATH.replace(/\\/g, '/')

  const cwd = path.join(__dirname, '../packages/emnapi')
  fs.rmSync(path.join(cwd, 'build'), { force: true, recursive: true })
  let emcmake = process.platform === 'win32' ? 'emcmake.bat' : 'emcmake'
  if (process.env.EMSDK) {
    emcmake = path.join(process.env.EMSDK, 'upstream/emscripten', emcmake)
  }

  const generatorOptions = which('ninja')
    ? ['-G', 'Ninja']
    : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])

  await spawn('cmake', [
    ...generatorOptions,
    '-DCMAKE_TOOLCHAIN_FILE=./cmake/wasm32.cmake',
    `-DLLVM_PREFIX=${LLVM_PATH}`,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-H.',
    '-Bbuild/wasm32'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build/wasm32'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/wasm32',
    '--prefix',
    sysroot
  ], cwd)

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

  let WASI_THREADS_CMAKE_TOOLCHAIN_FILE = ''
  if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-pthread.cmake'))) {
    WASI_THREADS_CMAKE_TOOLCHAIN_FILE = `${WASI_SDK_PATH}/share/cmake/wasi-sdk-pthread.cmake`
  } else if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-threads.cmake'))) {
    WASI_THREADS_CMAKE_TOOLCHAIN_FILE = `${WASI_SDK_PATH}/share/cmake/wasi-sdk-threads.cmake`
  }

  if (WASI_THREADS_CMAKE_TOOLCHAIN_FILE) {
    await spawn('cmake', [
      ...generatorOptions,
      `-DCMAKE_TOOLCHAIN_FILE=${WASI_THREADS_CMAKE_TOOLCHAIN_FILE}`,
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

  const { stderr: llvmClangVersion } = spawnSync(path.join(LLVM_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v', '--target=wasm32'])
  const { stderr: wasiSdkClangVersion } = spawnSync(path.join(WASI_SDK_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v'])
  const { stderr: emccVersion } = spawnSync(path.join(process.env.EMSDK, 'upstream/emscripten/emcc' + (process.platform === 'win32' ? '.bat' : '')), ['-v'])

  fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32.txt'), llvmClangVersion)
  fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi.txt'), wasiSdkClangVersion)
  fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32-emscripten.txt'), emccVersion)

  fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32.txt'))
  fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi.txt'))
  fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32-emscripten.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32-emscripten.txt'))

  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.min.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.d.ts'), path.join(sysroot, 'lib/emnapi', 'emnapi.d.ts'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.js'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.min.js'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.d.ts'), path.join(sysroot, 'lib/emnapi', 'emnapi-core.d.ts'))

  fs.copySync(path.join(sysroot, 'lib/wasm32-emscripten'), path.join(__dirname, '../packages/emnapi/lib/wasm32-emscripten'))
  fs.copySync(path.join(sysroot, 'lib/wasm32-wasi'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi'))
  fs.copySync(path.join(sysroot, 'lib/wasm32'), path.join(__dirname, '../packages/emnapi/lib/wasm32'))

  crossZip.zipSync(sysroot, path.join(__dirname, 'emnapi.zip'))
  // fs.rmSync(sysroot, { force: true, recursive: true })
}

main()
