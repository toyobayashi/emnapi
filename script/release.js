const fs = require('fs')
const path = require('path')
const crossZip = require('@tybys/cross-zip')
const { which } = require('./which.js')

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string=} cwdPath
 * @param {'inherit' | 'pipe' | 'ignore'=} stdin
 * @returns {Promise<void> & { cp: import('child_process').ChildProcess }}
 */
function spawn (command, args, cwdPath, stdin) {
  const argsString = args.map(a => a.indexOf(' ') !== -1 ? ('"' + a + '"') : a).join(' ')
  const cwd = cwdPath || process.cwd()
  console.log(`[spawn] ${cwd}${process.platform === 'win32' ? '>' : '$'} ${command} ${argsString}`)
  const cp = require('child_process').spawn(command, args, {
    env: process.env,
    cwd: cwd,
    stdio: stdin ? [stdin, 'inherit', 'inherit'] : 'inherit'
  })
  const p = new Promise((resolve, reject) => {
    cp.once('exit', (code, reason) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Child process exit: ${code}. Reason: ${reason}\n\n${command} ${argsString}\n`))
      }
    })
  })
  p.cp = cp
  return p
}

async function main () {
  const sysroot = path.join(__dirname, '../out')

  fs.rmSync(sysroot, { force: true, recursive: true })
  fs.mkdirSync(sysroot, { recursive: true })

  const cwd = path.join(__dirname, '../packages/emnapi')
  let emcmake = process.platform === 'win32' ? 'emcmake.bat' : 'emcmake'
  if (process.env.EMSDK) {
    emcmake = path.join(process.env.EMSDK, 'upstream/emscripten', emcmake)
  }

  await spawn(emcmake, [
    'cmake',
    ...(
      which('ninja')
        ? ['-G', 'Ninja']
        : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])
    ),
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_VERBOSE_MAKEFILE=1',
    '-DEMNAPI_INSTALL_SRC=1',
    '-H.',
    '-Bbuild'
  ], cwd)

  await spawn('cmake', [
    '--build',
    'build'
  ], cwd)

  await spawn('cmake', [
    '--install',
    'build',
    '--prefix',
    sysroot
  ], cwd)

  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.js'))
  fs.copyFileSync(path.join(__dirname, '../packages/runtime/dist/emnapi.min.js'), path.join(sysroot, 'lib/emnapi', 'emnapi.min.js'))

  crossZip.zipSync(sysroot, path.join(__dirname, 'emnapi.zip'))
  // fs.rmSync(sysroot, { force: true, recursive: true })
}

main()
