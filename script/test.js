const { spawnSync } = require('child_process')
const glob = require('glob')

const cwd = require('path').join(__dirname, '..')

const files = glob.sync('test/**/*.test.js', { cwd })

files.forEach((f) => {
  test(f)
})

function test (f) {
  console.log('Test: ' + f)
  console.time(f)
  const r = spawnSync('node', ['--expose-gc', f], { cwd, env: process.env, stdio: 'inherit' })
  if (r.status !== 0) {
    process.exit(r.status)
  }
  console.timeEnd(f)
  console.log()
}
