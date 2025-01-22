const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const { spawn } = require('../../../script/spawn.js')
const { which } = require('../../../script/which.js')

async function main () {
  const testVersions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 2147483647]
  const cwd = path.join(__dirname, '../../..')
  let emcmake = process.platform === 'win32' ? 'emcmake.bat' : 'emcmake'
  if (process.env.EMSDK) {
    emcmake = path.join(process.env.EMSDK, 'upstream/emscripten', emcmake)
  }
  const ninja = which('ninja')

  return Promise.allSettled(testVersions.map(async (version) => {
    // const dir = path.join(__dirname, `../build-version-${version}`)
    const buildDir = path.join(__dirname, `../.build/build-version-${version}`)
    fs.rmSync(buildDir, { force: true, recursive: true })
    fs.mkdirSync(buildDir, { recursive: true })
    await spawn(emcmake, [
      'cmake',
      ...(
        ninja
          ? ['-G', 'Ninja']
          : (process.platform === 'win32' ? ['-G', 'MinGW Makefiles', '-DCMAKE_MAKE_PROGRAM=make'] : [])
      ),
      `-DCMAKE_BUILD_TYPE=${process.argv[2] || 'Debug'}`,
      `-DNAPI_VERSION=${version}`,
      `-H${path.join(__dirname, '../../emnapi')}`,
      '-B', buildDir
    ], cwd, 'pipe')

    const buildPromise = spawn('cmake', [
      '--build',
      buildDir
    ], cwd, 'pipe')

    const stdoutPromise = new Promise((resolve) => {
      const stdoutBuffers = []
      buildPromise.cp.stdout.on('data', (data) => {
        stdoutBuffers.push(data)
      })
      buildPromise.cp.stdout.on('end', () => {
        resolve(Buffer.concat(stdoutBuffers).toString())
      })
    })

    try {
      await buildPromise
    } catch (err) {
      err.stdout = await stdoutPromise
      throw err
    }
  })).then(res => {
    let failed = false
    for (let i = 0; i < testVersions.length; ++i) {
      const result = res[i]
      if (result.status === 'fulfilled') {
        console.log(chalk.greenBright(`✔  NAPI_VERSION: ${testVersions[i]}`))
      } else if (result.status === 'rejected') {
        failed = true
        console.log('::group::' + chalk.redBright(`❌ NAPI_VERSION: ${testVersions[i]}`))
        console.log(result.reason.stdout)
        console.log('::endgroup::')
      }
    }
    if (failed) {
      process.exit(1)
    }
  })
}

main()
