if (process.env.EMNAPI_TEST_WASI_THREADS) {
  process.env.EMNAPI_TEST_WASI = 1
}

const { spawnSync } = require('child_process')
const path = require('path')
const glob = require('glob')

const cwd = path.join(__dirname, '..')
const subdir = process.argv[2]

let ignore = []

const pthread = [
  'node-addon-api/**/*',
  'pool/**/*',
  'tsfn/**/*',
  'async_cleanup_hook/**/*',
  'string/string-pthread.test.js'
]

if (process.env.EMNAPI_TEST_NATIVE) {
  ignore = [...new Set([
    ...ignore,
    'filename/**/*',
    'objwrap/objwrapref.test.js',
    'rust/**/*',
    '**/{emnapitest,node-addon-api}/**/*'
  ])]
} else if (!process.env.EMNAPI_TEST_WASI_THREADS && (process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32)) {
  ignore = [...new Set([
    ...ignore,
    ...pthread
  ])]
} else {
  ignore = [...new Set([
    ...ignore,
    'rust/**/*'
  ])]
}

let files = glob.sync(subdir
  ? subdir.endsWith('.js')
    ? subdir
    : `${subdir}/**/*.test.js`
  : '**/*.test.js', {
  cwd,
  ignore
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
    ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
    ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
    './script/test-entry.js',
    f
  ], { cwd, env: process.env, stdio: 'inherit' })
  if (r.status !== 0) {
    process.exit(r.status)
  }
  console.log()
}
