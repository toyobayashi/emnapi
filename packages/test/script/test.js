if (process.env.EMNAPI_TEST_WASI_THREADS) {
  process.env.EMNAPI_TEST_WASI = 1

  const path = require('path')
  const wasmPath = path.join(__dirname, '../.build/wasm32-wasip1-threads/Debug/async.wasm')
  const module = new WebAssembly.Module(require('fs').readFileSync(wasmPath))
  console.log('libemnapi-basic-mt: ' + (WebAssembly.Module.imports(module).filter(d => {
    return d.name === 'napi_create_async_work'
  }).length > 0))
}

const { spawn } = require('child_process')
const path = require('path')
const glob = require('glob')
const chalk = require('chalk')
const readline = require('readline')
const { StringDecoder } = require('string_decoder')

const cwd = path.join(__dirname, '..')
const options = parseOptions(process.argv.slice(2))
const subdir = options.subdir
const silent = options.silent
const concurrency = parseConcurrency(process.env.EMNAPI_TEST_CONCURRENCY)
const startTime = Date.now()

let ignore = [
  'rust/**/*',
  'tsfn2/tsfn2_st.test.js',
  'async/async_st.test.js',
]

const pthread = [
  'v8_hello_world/**/*',
  'nan/**/*',
  'node-addon-api/**/*',
  'pool/**/*',
  'tsfn/**/*',
  'tsfn_shutdown/**/*',
  'tsfn_abort/**/*',
  'async_cleanup_hook/**/*',
  'string/string-pthread.test.js',
  'uv_threadpool_size/**/*',
  'trap_in_thread/**/*',
  'sharedarraybuffer/sharedarraybuffer_mt.test.js',
]

if (!require('fs').existsSync(path.join(__dirname, '../../emnapi/include/node/v8.h'))) {
  console.log('v8 headers not found, skipping v8_hello_world tests')
  ignore.push('v8_hello_world/**/*')
  ignore.push('nan/**/*')
}

if (process.env.EMNAPI_TEST_NATIVE) {
  ignore = [...new Set([
    ...ignore,
    'filename/**/*',
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

let files = glob.globSync(subdir
  ? subdir.endsWith('.js')
    ? subdir
    : `${subdir}/**/*.test.js`
  : '**/*.test.js', {
  cwd,
  ignore
})
// let files = ['node-addon-api/async_progress_queue_worker.test.js']

const fileGroups = [
  files.filter(f => !f.includes('node-addon-api')),
  files.filter(f => f.includes('node-addon-api'))
]

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})

async function main () {
  const reporter = createReporter(files.length)
  reporter.start()

  for (const group of fileGroups) {
    if (group.length === 0) continue
    await run(group, reporter)
  }

  reporter.finish()
  if (reporter.failed > 0) process.exitCode = 1
}

async function run (testFiles, reporter) {
  let nextIndex = 0
  let nextReportIndex = 0
  const results = []

  async function worker (threadId) {
    while (nextIndex < testFiles.length) {
      const index = nextIndex++
      const f = testFiles[index]
      reporter.startTest(f)
      const result = await test(
        f,
        threadId,
        (stream, chunk) => reporter.output(f, stream, chunk)
      )
      reporter.flushTestOutput(f)
      reporter.completeTest(f)
      results[index] = result
      reportCompleted()
    }
  }

  function reportCompleted () {
    while (results[nextReportIndex]) {
      reporter.report(testFiles[nextReportIndex], results[nextReportIndex])
      nextReportIndex++
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, testFiles.length) },
      (_, index) => worker(index + 1)
    )
  )
}

function test (f, threadId, onOutput) {
  return new Promise((resolve) => {
    const testStartTime = Date.now()
    const output = []
    let spawnError
    const additionalFlags = []
    if (f.includes('async_context')) {
      additionalFlags.push('--gc-interval=100', '--gc-global')
    }
    if (f.endsWith('ref_finalizer.test.js')) {
      additionalFlags.push('--force-node-api-uncaught-exceptions-policy')
    }
    const child = spawn('node', [
      '--expose-gc',
      ...additionalFlags,
      ...(process.env.EMNAPI_TEST_WASI ? ['--experimental-wasi-unstable-preview1'] : []),
      // ...(process.env.MEMORY64 ? ['--experimental-wasm-memory64'] : []),
      './script/test-entry.js',
      f
    ], {
      cwd,
      env: {
        ...process.env,
        EMNAPI_TEST_CHILD_REPORTER: '1',
        ...(concurrency > 1
          ? {
              TEST_PARALLEL: '1',
              TEST_THREAD_ID: String(threadId)
            }
          : {})
      },
      stdio: ['inherit', 'pipe', 'pipe']
    })

    child.stdout.on('data', chunk => {
      output.push(chunk)
      onOutput('stdout', chunk)
    })
    child.stderr.on('data', chunk => {
      output.push(chunk)
      onOutput('stderr', chunk)
    })
    child.once('error', err => {
      spawnError = err
    })
    child.once('close', (code, signal) => {
      if (spawnError) {
        const chunk = Buffer.from(`${spawnError.stack || spawnError}\n`)
        output.push(chunk)
        onOutput('stderr', chunk)
      }
      if (signal) {
        const chunk = Buffer.from(`${f} exited with signal ${signal}\n`)
        output.push(chunk)
        onOutput('stderr', chunk)
      }
      resolve({
        status: code || (signal || spawnError ? 1 : 0),
        output,
        duration: Date.now() - testStartTime
      })
    })
  })
}

function createReporter (total) {
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const failures = []
  const active = new Set()
  const outputStreams = new Map()
  const interactive = Boolean(process.stdout.isTTY)
  let spinnerIndex = 0
  let spinnerTimer
  let loadingPrinted = false

  return {
    total,
    completed: 0,
    passed: 0,
    failed: 0,

    start () {
      console.log()
      console.log(
        chalk.bold(' RUN '),
        chalk.dim(
          `${total} test files, concurrency ${concurrency}` +
          (silent ? ', output silent' : '')
        )
      )
      console.log()

      if (interactive) {
        spinnerTimer = setInterval(() => {
          spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length
          this.renderLoading()
        }, 80)
        spinnerTimer.unref()
      }
    },

    startTest (file) {
      active.add(file)
      this.renderLoading()
    },

    completeTest (file) {
      active.delete(file)
      this.renderLoading()
    },

    output (file, stream, chunk) {
      if (silent) return

      const key = `${file}\0${stream}`
      let state = outputStreams.get(key)
      if (!state) {
        state = {
          decoder: new StringDecoder('utf8'),
          pending: ''
        }
        outputStreams.set(key, state)
      }

      const lines = (state.pending + state.decoder.write(chunk)).split(/\r?\n/)
      state.pending = lines.pop()
      this.clearLoading()
      for (const line of lines) {
        printOutputLine(file, stream, line)
      }
      this.renderLoading()
    },

    flushTestOutput (file) {
      if (silent) return

      this.clearLoading()
      for (const stream of ['stdout', 'stderr']) {
        const key = `${file}\0${stream}`
        const state = outputStreams.get(key)
        if (!state) continue

        const finalText = state.pending + state.decoder.end()
        if (finalText.length > 0) printOutputLine(file, stream, finalText)
        outputStreams.delete(key)
      }
      this.renderLoading()
    },

    renderLoading () {
      if (active.size === 0) {
        this.clearLoading()
        return
      }

      const firstFile = active.values().next().value
      const remaining = active.size > 1 ? chalk.dim(` +${active.size - 1}`) : ''
      const progress = chalk.dim(`[${this.completed}/${this.total}]`)

      if (!interactive) {
        if (!loadingPrinted) {
          console.log(` ${chalk.yellow('...')} ${progress} Running ${firstFile}${remaining}`)
          loadingPrinted = true
        }
        return
      }

      this.clearLoading()
      process.stdout.write(
        ` ${chalk.yellow(spinnerFrames[spinnerIndex])} ${progress} Running ${firstFile}${remaining}`
      )
    },

    clearLoading () {
      if (!interactive) return
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
    },

    report (file, result) {
      this.clearLoading()
      this.completed++
      const progress = chalk.dim(`[${this.completed}/${this.total}]`)
      const duration = chalk.dim(formatDuration(result.duration))

      if (result.status === 0) {
        this.passed++
        console.log(` ${chalk.green('✓')} ${progress} ${file} ${duration}`)
      } else {
        this.failed++
        failures.push({ file, result })
        console.log(` ${chalk.red('✗')} ${progress} ${file} ${duration}`)
      }

      this.renderLoading()
    },

    finish () {
      if (spinnerTimer) clearInterval(spinnerTimer)
      this.clearLoading()

      if (failures.length > 0) {
        console.log()
        console.log(chalk.red.bold(` Failed Tests ${failures.length} `))

        for (const { file, result } of failures) {
          console.log()
          console.log(chalk.bgRed.white.bold(' FAIL '), chalk.red.bold(file))
          console.log(chalk.red('─'.repeat(72)))
          const failureOutput = Buffer.concat(result.output)
          if (failureOutput.length > 0) {
            process.stdout.write(failureOutput)
            if (failureOutput[failureOutput.length - 1] !== 10) {
              process.stdout.write('\n')
            }
          } else {
            console.log(chalk.red(`Test exited with status ${result.status} without output`))
          }
        }
      }

      const passed = `${this.passed} passed`
      const failed = `${this.failed} failed`
      const totalDuration = formatDuration(Date.now() - startTime)

      console.log()
      console.log(chalk.bold(' Test Files '), [
        chalk.green(passed),
        this.failed > 0 ? chalk.red(failed) : chalk.dim(failed),
        chalk.dim(`(${this.total})`)
      ].join(' | '))
      console.log(chalk.bold(' Duration   '), totalDuration)
      console.log()
    }
  }
}

function printOutputLine (file, stream, line) {
  const label = stream === 'stderr'
    ? chalk.red('stderr')
    : chalk.cyan('stdout')
  console.log(` ${label} ${chalk.dim('|')} ${chalk.dim(file)} ${chalk.dim('>')} ${line}`)
}

function formatDuration (duration) {
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

function parseOptions (args) {
  let subdir
  let silent = ['1', 'true'].includes(
    String(process.env.EMNAPI_TEST_SILENT).toLowerCase()
  )

  for (const arg of args) {
    if (arg === '--silent') {
      silent = true
    } else if (arg === '--no-silent') {
      silent = false
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    } else if (subdir === undefined) {
      subdir = arg
    } else {
      throw new Error(`Unexpected argument: ${arg}`)
    }
  }

  return { subdir, silent }
}

function parseConcurrency (value) {
  if (value === undefined || value === '') return 1

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('EMNAPI_TEST_CONCURRENCY must be a positive integer')
  }
  return parsed
}
