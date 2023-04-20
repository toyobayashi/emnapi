const path = require('path')
const fs = require('fs')
const { spawn, ChildProcessError } = require('../../../script/spawn.js')
const { which } = require('../../../script/which.js')

async function main () {
  const buildDir = path.join(__dirname, `../.build/${process.arch}-${process.platform}`)
  const cwd = path.join(__dirname, '..')

  fs.rmSync(buildDir, { force: true, recursive: true })
  fs.mkdirSync(buildDir, { recursive: true })

  try {
    await spawn(which('npx'), [
      'cmake-js',
      'rebuild',
      ...(process.argv[2] === 'Release' ? [] : ['-D']),
      '-O',
      buildDir
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
