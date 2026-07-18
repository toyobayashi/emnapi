import fs from 'fs-extra'
import path from 'path'
import crossZip from '@tybys/cross-zip'
import { which } from './which.js'
import { spawn, spawnSync, ChildProcessError } from './spawn.js'

const __dirname = import.meta.dirname

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

  // await spawn('cmake', [
  //   ...generatorOptions,
  //   '-DCMAKE_TOOLCHAIN_FILE=./cmake/wasm32.cmake',
  //   `-DLLVM_PREFIX=${LLVM_PATH}`,
  //   '-DCMAKE_BUILD_TYPE=Release',
  //   '-DCMAKE_VERBOSE_MAKEFILE=1',
  //   '-DNAPI_EXPERIMENTAL=1',
  //   '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
  //   '-H.',
  //   '-Bbuild/wasm32'
  // ], cwd)

  // await spawn('cmake', [
  //   '--build',
  //   'build/wasm32'
  // ], cwd)

  // await spawn('cmake', [
  //   '--install',
  //   'build/wasm32',
  //   '--prefix',
  //   sysroot
  // ], cwd)

  // const wasiToolchainFile = `${WASI_SDK_PATH}/share/cmake/wasi-sdk.cmake`

  // await spawn('cmake', [
  //   ...generatorOptions,
  //   `-DCMAKE_TOOLCHAIN_FILE=${wasiToolchainFile}`,
  //   `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
  //   '-DCMAKE_BUILD_TYPE=Release',
  //   '-DCMAKE_VERBOSE_MAKEFILE=1',
  //   '-DNAPI_EXPERIMENTAL=1',
  //   '-DNODE_API_EXPERIMENTAL_NO_WARNING=1',
  //   '-H.',
  //   '-Bbuild/wasm32-wasi'
  // ], cwd)

  // await spawn('cmake', [
  //   '--build',
  //   'build/wasm32-wasi'
  // ], cwd)

  // await spawn('cmake', [
  //   '--install',
  //   'build/wasm32-wasi',
  //   '--prefix',
  //   sysroot
  // ], cwd)

  // wasi-sdk >= 25 ships a toolchain file targeting wasm32-wasip1 directly
  if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-p1.cmake'))) {
    await spawn('cmake', [
      ...generatorOptions,
      `-DCMAKE_TOOLCHAIN_FILE=${WASI_SDK_PATH}/share/cmake/wasi-sdk-p1.cmake`,
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
  } else {
    throw new Error('share/cmake/wasi-sdk-p1.cmake not found, please use latest wasi-sdk')
  }

  let WASI_THREADS_CMAKE_TOOLCHAIN_FILE = ''
  if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-pthread.cmake'))) {
    WASI_THREADS_CMAKE_TOOLCHAIN_FILE = `${WASI_SDK_PATH}/share/cmake/wasi-sdk-pthread.cmake`
  } else if (fs.existsSync(path.join(wasiSdkPath, 'share/cmake/wasi-sdk-threads.cmake'))) {
    WASI_THREADS_CMAKE_TOOLCHAIN_FILE = `${WASI_SDK_PATH}/share/cmake/wasi-sdk-threads.cmake`
  }

  if (WASI_THREADS_CMAKE_TOOLCHAIN_FILE) {
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
  } else {
    throw new Error('WASI_THREADS_CMAKE_TOOLCHAIN_FILE not found, please use latest wasi-sdk')
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

  const { stderr: llvmClangVersion } = spawnSync(path.join(LLVM_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v', '--target=wasm32-wasip1-threads'])
  const { stderr: wasiSdkClangVersion } = spawnSync(path.join(WASI_SDK_PATH, 'bin/clang' + (process.platform === 'win32' ? '.exe' : '')), ['-v'])

  const emcc = (process.env.EMSDK ? path.join(process.env.EMSDK, 'upstream/emscripten/emcc') : 'emcc') + (process.platform === 'win32' ? '.bat' : '')
  const { stderr: emccVersion } = spawnSync(emcc, ['-v'])

  console.log('================   emcc   ================')
  console.log(emccVersion.toString())
  console.log('================ wasi-sdk ================')
  console.log(wasiSdkClangVersion.toString())
  console.log('================  clang  =================')
  console.log(llvmClangVersion.toString())

  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.js'), path.join(sysroot, 'dist', 'emnapi.js'))
  // fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.min.js'), path.join(sysroot, 'dist', 'emnapi.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.d.ts'), path.join(sysroot, 'dist', 'emnapi.d.ts'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.js'), path.join(sysroot, 'dist', 'emnapi-core.js'))
  // fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.min.js'), path.join(sysroot, 'dist', 'emnapi-core.min.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.d.ts'), path.join(sysroot, 'dist', 'emnapi-core.d.ts'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.full.js'), path.join(sysroot, 'dist', 'emnapi-core.full.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/core/dist/emnapi-core.full.d.ts'), path.join(sysroot, 'dist', 'emnapi-core.full.d.ts'))

  fs.copySync(path.join(sysroot, 'lib/wasm32-emscripten'), path.join(__dirname, '../packages/emnapi/lib/wasm32-emscripten'))
  fs.copySync(path.join(sysroot, 'lib/wasm64-emscripten'), path.join(__dirname, '../packages/emnapi/lib/wasm64-emscripten'))

  // the freshly built sysroot must contain exactly the expected archive sets;
  // checked before copying so that stale files in packages/emnapi/lib can
  // never mask an archive missing from this build
  for (const [arch, expected] of Object.entries(EXPECTED_WASI_ARCHIVES)) {
    assertArchiveSet(path.join(sysroot, 'lib', arch), expected)
  }

  // fs.copySync(path.join(sysroot, 'lib/wasm32-wasi'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasi'))
  fs.copySync(path.join(sysroot, 'lib/wasm32-wasip1'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasip1'))
  // fs.copySync(path.join(sysroot, 'lib/wasm32'), path.join(__dirname, '../packages/emnapi/lib/wasm32'))
  if (WASI_THREADS_CMAKE_TOOLCHAIN_FILE) {
    fs.copySync(path.join(sysroot, 'lib/wasm32-wasip1-threads'), path.join(__dirname, '../packages/emnapi/lib/wasm32-wasip1-threads'))
  }

  // the shipped lib dirs must match exactly too (catches leftovers from
  // previous local runs, since fs.copySync merges into an existing dir)
  for (const [arch, expected] of Object.entries(EXPECTED_WASI_ARCHIVES)) {
    assertArchiveSet(path.join(__dirname, '../packages/emnapi/lib', arch), expected)
  }

  crossZip.zipSync(sysroot, path.join(__dirname, 'emnapi.zip'))
  // fs.rmSync(sysroot, { force: true, recursive: true })

  console.log(`Output: ${sysroot}`)
}

// exact archive sets shipped in packages/emnapi/lib for each wasi target;
// keep in sync with the install() rules in packages/emnapi/CMakeLists.txt
const EXPECTED_WASI_ARCHIVES = {
  'wasm32-wasip1': [
    'libemnapi.a',
    'libemnapi-basic-napi-rs.a'
  ],
  'wasm32-wasip1-threads': [
    'libemnapi.a',
    'libemnapi-mt.a',
    'libemnapi-napi-rs-mt.a'
  ]
}

if (fs.existsSync(path.join(__dirname, '../packages/emnapi/include/node/v8.h'))) {
  EXPECTED_WASI_ARCHIVES['wasm32-wasip1'].push('libv8.a')
  EXPECTED_WASI_ARCHIVES['wasm32-wasip1-threads'].push('libv8.a')
  EXPECTED_WASI_ARCHIVES['wasm32-wasip1-threads'].push('libv8-mt.a')
}

function assertArchiveSet (libDir, expected) {
  const actual = fs.existsSync(libDir) ? fs.readdirSync(libDir) : []
  const missing = expected.filter(name => !actual.includes(name))
  const unexpected = actual.filter(name => !expected.includes(name))
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Unexpected archive set in ${libDir}\n` +
      `  missing: ${missing.length > 0 ? missing.join(', ') : '(none)'}\n` +
      `  unexpected: ${unexpected.length > 0 ? unexpected.join(', ') : '(none)'}`
    )
  }
}

main().catch(err => {
  if (err instanceof ChildProcessError) {
    process.exit(err.code)
  } else {
    console.error(err)
    process.exit(1)
  }
})
