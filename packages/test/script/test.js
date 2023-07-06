if (process.env.EMNAPI_TEST_WASI_THREADS) {
  process.env.EMNAPI_TEST_WASI = 1
}

const { spawnSync } = require('child_process')
const path = require('path')
const glob = require('glob')

const cwd = path.join(__dirname, '..')
const subdir = process.argv[2]

let ignore = [
  'rust/**/*'
]

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
    'jspi/**/*',
    'objwrap/objwrapref.test.js',
    // 'rust/**/*',
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
    // 'rust/**/*'
  ])]
}

if (process.env.EMNAPI_TEST_WASI_THREADS || process.env.EMNAPI_TEST_WASI || process.env.EMNAPI_TEST_WASM32) {
  ignore = [...new Set([
    ...ignore,
    'jspi/**/*'
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
  if (f.endsWith('ref_finalizer.test.js')) {
    additionalFlags.push('--force-node-api-uncaught-exceptions-policy')
  }
  const r = spawnSync('node', [
    '--expose-gc',
    ...additionalFlags,
    ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
    ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
    '--experimental-wasm-stack-switching',
    './script/test-entry.js',
    f
  ], { cwd, env: process.env, stdio: 'inherit' })
  if (r.status) {
    process.exit(r.status)
  }
  console.log()
}
