const { spawnSync } = require('child_process')
const glob = require('glob')

const cwd = require('path').join(__dirname, '..')
const subdir = process.argv[2]

let files = glob.sync(subdir
  ? subdir.endsWith('.js')
    ? subdir
    : `${subdir}/**/*.test.js`
  : '**/*.test.js', {
  cwd,
  ignore: process.env.EMNAPI_TEST_NATIVE
    ? [
        'filename/**/*',
        'objwrap/objwrapref.test.js',
        '**/{emnapitest,node-addon-api}/**/*'
      ]
    : process.env.MEMORY64
      ? [
          'node-addon-api/**/*',
          'async/**/*',
          'pool/**/*',
          'tsfn/**/*',
          'async_cleanup_hook/**/*',
          'string/string-pthread.test.js'
        ]
      : []
})
// let files = ['node-addon-api/async_progress_queue_worker.test.js']

files = [
  ...files.filter(f => !f.includes('node-addon-api')),
  ...files.filter(f => f.includes('node-addon-api'))
]

files.forEach((f) => {
  test(f)
})

function test (f) {
  const additionalFlags = []
  if (f.includes('async_context')) {
    additionalFlags.push('--gc-interval=100', '--gc-global')
  }
  const r = spawnSync('node', [
    '--expose-gc',
    ...additionalFlags,
    ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
    './script/test-entry.js',
    f
  ], { cwd, env: process.env, stdio: 'inherit' })
  if (r.status !== 0) {
    process.exit(r.status)
  }
  console.log()
}
