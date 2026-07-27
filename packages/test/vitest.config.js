import { configDefaults, defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from 'vite-plugin-commonjs'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { browserEquivalentTests } from './browser/browser-equivalent-tests.mjs'

const browserDir = fileURLToPath(new URL('./browser/', import.meta.url))
const buildDir = fileURLToPath(new URL('./.build', import.meta.url))
const testDir = fileURLToPath(new URL('./', import.meta.url))
const browserFilter = process.env.EMNAPI_TEST_BROWSER_FILTER || ''
const browserEnv = Object.fromEntries(
  [
    'EMNAPI_TEST_4GB',
    'EMNAPI_TEST_WASI',
    'EMNAPI_TEST_WASI_THREADS',
    'EMNAPI_TEST_WASM32',
    'MEMORY64',
    'NODE_ENV',
    'UV_THREADPOOL_SIZE'
  ]
    .filter(name => process.env[name] !== undefined)
    .map(name => [name, process.env[name]])
)
const isNonThreadedStandaloneWasm = Boolean(
  (browserEnv.EMNAPI_TEST_WASI && !browserEnv.EMNAPI_TEST_WASI_THREADS) ||
  browserEnv.EMNAPI_TEST_WASM32
)
const nonThreadedStandaloneExcludes = [
  '**/v8_hello_world/**',
  '**/nan/**',
  '**/node-addon-api/**',
  '**/pool/**',
  '**/tsfn/**',
  '**/tsfn_shutdown/**',
  '**/tsfn_abort/**',
  '**/async_cleanup_hook/**',
  '**/string/string-pthread.test.js',
  '**/uv_threadpool_size/**',
  '**/trap_in_thread/**',
  '**/sharedarraybuffer/sharedarraybuffer_mt.test.js'
]

function emscriptenWorkerScripts () {
  return {
    name: 'emnapi-emscripten-worker-scripts',
    configureServer (server) {
      server.middlewares.use('/@emnapi-worker/', async (request, response, next) => {
        const relativePath = decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '')
        const filename = resolve(buildDir, relativePath)
        if (!filename.startsWith(buildDir + sep)) {
          next()
          return
        }
        try {
          response.setHeader('Content-Type', 'text/javascript')
          response.end(await readFile(filename))
        } catch {
          next()
        }
      })
    }
  }
}

function legacyTestFiles () {
  return {
    name: 'emnapi-legacy-test-files',
    enforce: 'pre',
    transform (source, id) {
      const [filename, query = ''] = id.split('?')
      if (query.includes('emnapi-legacy') ||
          !filename.startsWith(testDir) ||
          !filename.endsWith('.test.js')) {
        return
      }

      const name = filename.slice(testDir.length)
      if (browserFilter && !name.includes(browserFilter)) {
        return `
          import { test } from 'vitest'
          test.skip(${JSON.stringify(name)}, () => {})
        `
      }
      const reason = browserEquivalentTests.get(name)
      if (reason) {
        return `
          import { test } from 'vitest'
          import { runEquivalentTest } from ${JSON.stringify(browserDir + 'equivalent-tests.mjs')}
          test(${JSON.stringify(`${name} (browser equivalent: ${reason})`)}, () => {
            return runEquivalentTest(${JSON.stringify(name)})
          })
        `
      }

      return `
        import { test } from 'vitest'
        import { load } from ${JSON.stringify(testDir + 'util.mjs')}
        import common from ${JSON.stringify(browserDir + 'common.js')}
        import entry from ${JSON.stringify(filename + '?emnapi-legacy')}

        test(${JSON.stringify(name)}, async (context) => {
          common.resetMustCalls()
          if (entry && entry.skip) {
            context.skip()
            return
          }
          if (entry && typeof entry.then === 'function') {
            await entry
          } else if (entry && typeof entry.test === 'function') {
            await load(entry.target).then(entry.test)
          } else {
            throw new TypeError(${JSON.stringify(`${name} did not export a test promise or { target, test }`)})
          }
          common.verifyMustCalls()
        })
      `
    }
  }
}

export default defineConfig({
  define: {
    'globalThis.__EMNAPI_BROWSER_ENV__': JSON.stringify(browserEnv),
    'import.meta.env.EMNAPI_TEST_BROWSER_FILTER': JSON.stringify(browserFilter)
  },
  resolve: {
    alias: [
      {
        find: 'worker_threads',
        replacement: browserDir + 'worker-threads.mjs'
      },
      {
        find: 'fs',
        replacement: browserDir + 'fs.mjs'
      },
      {
        find: 'internal/test/binding',
        replacement: browserDir + 'empty.mjs'
      },
      {
        find: '@emnapi/node-binding',
        replacement: browserDir + 'empty.mjs'
      },
      {
        find: 'tap',
        replacement: browserDir + 'tap.js'
      },
      {
        find: fileURLToPath(new URL('./common.js', import.meta.url)),
        replacement: browserDir + 'common.js'
      },
      {
        find: '../common',
        replacement: browserDir + 'common.js'
      }
    ]
  },
  optimizeDeps: {
    include: [
      '@tybys/wasm-util',
      'assert',
      'path',
      'util',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process'
    ]
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  plugins: [
    emscriptenWorkerScripts(),
    legacyTestFiles(),
    commonjs({
      filter (id) {
        const filename = id.split('?')[0]
        return filename.startsWith(testDir) && filename.endsWith('.js') &&
          (id.includes('?emnapi-legacy') || !filename.endsWith('.test.js')) &&
          !filename.endsWith('/vitest.config.js') &&
          !filename.endsWith('/async-wasi.test.browser.js')
      }
    }),
    nodePolyfills({
      include: [
        'assert',
        'buffer',
        'events',
        'path',
        'process',
        'stream',
        'timers',
        'timers/promises',
        'util'
      ],
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true
      },
      protocolImports: true
    })
  ],
  test: {
    testTimeout: process.env.CI ? 60_000 : 15_000,
    setupFiles: ['./browser/setup.mjs'],
    include: [
      './**/*.test.js',
      ...(browserEnv.EMNAPI_TEST_WASI_THREADS ? ['./**/*.test.browser.js'] : [])
    ],
    exclude: [
      ...configDefaults.exclude,
      ...(isNonThreadedStandaloneWasm ? nonThreadedStandaloneExcludes : [])
    ],
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          args: ['--js-flags=--expose-gc']
        }
      }),
      // https://vitest.dev/config/browser/playwright
      instances: [
        { browser: 'chromium' }
      ]
    }
  }
})
