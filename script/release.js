const fs = require('fs-extra')
const path = require('path')
const crossZip = require('@tybys/cross-zip')
const { which } = require('./which.js')
const { spawn, spawnSync, ChildProcessError } = require('./spawn.js')

async function main () {
  await Promise.resolve()
  const sysroot = process.argv[2] || path.join(__dirname, '../out')

  fs.rmSync(sysroot, { force: true, recursive: true })
  fs.mkdirSync(sysroot, { recursive: true })

  let WASI_SDK_PATH = process.env.WASI_SDK_PATH || process.env.LLVM_PATH
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
    '-DNAPI_EXPERIMENTAL=1',
    '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
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

  const wasiToolchainFile = `${WASI_SDK_PATH}/share/cmake/wasi-sdk.cmake`

  await spawn('cmake', [
    ...generatorOptions,
    `-DCMAKE_TOOLCHAIN_FILE=${wasiToolchainFile}`,
    `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-DNAPI_EXPERIMENTAL=1',
    '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
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

  const wasip1ToolchainFile = path.join(__dirname, 'wasip1.cmake')
  fs.writeFileSync(
    wasip1ToolchainFile,
    fs.readFileSync(wasiToolchainFile, 'utf8').replace(/wasm32-wasi/g, 'wasm32-wasip1'),
    'utf8'
  )

  await spawn('cmake', [
    ...generatorOptions,
    `-DCMAKE_TOOLCHAIN_FILE=${wasip1ToolchainFile.replace(/\\/g, '/')}`,
    `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-DNAPI_EXPERIMENTAL=1',
    '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
    '-H.',
    '-Bbuild/wasm32-wasip1'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build/wasm32-wasip1'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/wasm32-wasip1',
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
      '-DNAPI_EXPERIMENTAL=1',
      '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
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

    const wasip1ThreadsToolchainFile = path.join(__dirname, 'wasip1-threads.cmake')
    fs.writeFileSync(
      wasip1ThreadsToolchainFile,
      fs.readFileSync(WASI_THREADS_CMAKE_TOOLCHAIN_FILE, 'utf8').replace(/wasm32-wasi-threads/g, 'wasm32-wasip1-threads'),
      'utf8'
    )

    await spawn('cmake', [
      ...generatorOptions,
      `-DCMAKE_TOOLCHAIN_FILE=${wasip1ThreadsToolchainFile.replace(/\\/g, '/')}`,
      `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
      '-DCMAKE_BUILD_TYPE=Release',
      '-DCMAKE_VERBOSE_MAKEFILE=1',
      '-DNAPI_EXPERIMENTAL=1',
      '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
      '-H.',
      '-Bbuild/wasm32-wasip1-threads'
    ], cwd)

    await spawn('cmake', [
      '--build',
      'build/wasm32-wasip1-threads'
    ], cwd)

    await spawn('cmake', [
      '--install',
      'build/wasm32-wasip1-threads',
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
    '-DNAPI_EXPERIMENTAL=1',
    '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
    '-H.',
    '-Bbuild/wasm32-emscripten'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build/wasm32-emscripten'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/wasm32-emscripten',
    '--prefix',
    sysroot
  ], cwd)

  await spawn(emcmake, [
    'cmake',
    ...generatorOptions,
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-DEMNAPI_INSTALL_SRC=1',
    '-DNAPI_EXPERIMENTAL=1',
    '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
    '-DCMAKE_C_FLAGS=-sMEMORY64=1',
    '-H.',
    '-Bbuild/wasm64-emscripten'
  ], cwd, 'inherit', {
    ...process.env,
    CFLAGS: '-sMEMORY64=1'
  })

  await spawn('cmake', [
    '--build',
    'build/wasm64-emscripten'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build/wasm64-emscripten',
    '--prefix',
    sysroot
  ], cwd)

  const { stderr: llvmClangVersion } = spawnSync(path.join(LLVM_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v', '--target=wasm32'])
  const { stderr: wasiSdkClangVersion } = spawnSync(path.join(WASI_SDK_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v'])

  const emcc = (process.env.EMSDK ? path.join(process.env.EMSDK, 'upstream/emscripten/emcc') : 'emcc') + (process.platform === 'win32' ? '.bat' : '')
  const { stderr: emccVersion } = spawnSync(emcc, ['-v'])

  console.log('================   emcc   ================')
  console.log(emccVersion.toString())
  console.log('================ wasi-sdk ================')
  console.log(wasiSdkClangVersion.toString())
  console.log('================  clang  =================')
  console.log(llvmClangVersion.toString())

  // fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32.txt'), llvmClangVersion)
  // fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi.txt'), wasiSdkClangVersion)
  // fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32-emscripten.txt'), emccVersion)

  // fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32.txt'))
  // fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi.txt'))
  // fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32-emscripten.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32-emscripten.txt'))

  // if (WASI_THREADS_CMAKE_TOOLCHAIN_FILE) {
  //   const { stderr: wasiSdkClangVersion } = spawnSync(path.join(WASI_SDK_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v', '--target=wasm32-wasi-threads'])
  //   fs.writeFileSync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi-threads.txt'), wasiSdkClangVersion)
  //   fs.copySync(path.join(sysroot, 'lib/emnapi', 'wasm32-wasi-threads.txt'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi-threads.txt'))
  // }

  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.js'), path.join(sysroot, 'dist', 'emnapi.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.min.js'), path.join(sysroot, 'dist', 'emnapi.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.d.ts'), path.join(sysroot, 'dist', 'emnapi.d.ts'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.js'), path.join(sysroot, 'dist', 'emnapi-core.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.min.js'), path.join(sysroot, 'dist', 'emnapi-core.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.d.ts'), path.join(sysroot, 'dist', 'emnapi-core.d.ts'))

  fs.copySync(path.join(sysroot, 'lib/wasm32-emscripten'), path.join(__dirname, '../packages/emnapi/lib/wasm32-emscripten'))
  fs.copySync(path.join(sysroot, 'lib/wasm64-emscripten'), path.join(__dirname, '../packages/emnapi/lib/wasm64-emscripten'))
  fs.copySync(path.join(sysroot, 'lib/wasm32-wasi'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi'))
  fs.copySync(path.join(sysroot, 'lib/wasm32-wasip1'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasip1'))
  fs.copySync(path.join(sysroot, 'lib/wasm32'), path.join(__dirname, '../packages/emnapi/lib/wasm32'))
  if (WASI_THREADS_CMAKE_TOOLCHAIN_FILE) {
    fs.copySync(path.join(sysroot, 'lib/wasm32-wasi-threads'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi-threads'))
    fs.copySync(path.join(sysroot, 'lib/wasm32-wasip1-threads'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasip1-threads'))
  }

  crossZip.zipSync(sysroot, path.join(__dirname, 'emnapi.zip'))
  // fs.rmSync(sysroot, { force: true, recursive: true })

  console.log(`Output: ${sysroot}`)
}

main().catch(err => {
  if (err instanceof ChildProcessError) {
    process.exit(err.code)
  } else {
    console.error(err)
    process.exit(1)
  }
})
