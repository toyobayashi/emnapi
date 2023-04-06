const path = require('path')
const fs = require('fs')
const { spawn, ChildProcessError } = require('../../../script/spawn.js')
const { which } = require('../../../script/which.js')

async function main () {
  const buildDir = path.join(__dirname, '../.cgenbuild')
  const cwd = path.join(__dirname, '..')

  fs.rmSync(buildDir, { force: true, recursive: true })
  fs.mkdirSync(buildDir, { recursive: true })
  let emcmake = process.platform === 'win32' ? 'emcmake.bat' : 'emcmake'
  if (process.env.EMSDK) {
    emcmake = path.join(process.env.EMSDK, 'upstream/emscripten', emcmake)
  }

  try {
    await spawn(emcmake, [
      'cmake',
      ...(
        which('ninja')
          ? ['-G', 'Ninja']
          : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])
      ),
      `-DCMAKE_BUILD_TYPE=${process.argv[2] || 'Debug'}`,
      // '-DCMAKE_VERBOSE_MAKEFILE=1',
      '-H.',
      '-B', buildDir
    ], cwd)

    await spawn('cmake', [
      '--build',
      buildDir,
      '--clean-first'
    ], cwd)
  } catch (err) {
    if (err instanceof ChildProcessError) {
      process.exit(err.code)
    } else {
      throw err
    }
  }
}

main()
