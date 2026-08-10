import process from 'node:process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Benchmark = require('benchmark')

const args = new Set(process.argv.slice(2))
const json = args.has('--json')
const quick = args.has('--quick')
const filterArg = process.argv.find(arg => arg.startsWith('--filter='))
const filter = filterArg ? new RegExp(filterArg.slice('--filter='.length), 'i') : null

const benchmarkOptions = quick
  ? { maxTime: 0.25, minSamples: 10 }
  : { maxTime: 1, minSamples: 30 }

const providers = await loadProviders()
verifyProviders(providers)

const cases = [
  {
    name: 'emptyFunction',
    description: 'function () {}',
    providers: ['embind', 'c', 'cpp'],
    run: binding => () => binding.emptyFunction()
  },
  {
    name: 'returnParam',
    description: 'function (obj) { return obj }',
    providers: ['embind', 'c', 'cpp'],
    run: binding => {
      const value = {}
      return () => binding.returnParam(value)
    }
  },
  {
    name: 'convertInteger',
    description: 'function (int) { return copy(int) }',
    providers: ['embind', 'c', 'cpp'],
    run: binding => () => binding.convertInteger(1)
  },
  {
    name: 'convertBigIntInt64',
    description: 'truncate a wide BigInt to int64 and create a BigInt result',
    providers: ['c'],
    run: binding => {
      const value = (1n << 100n) + 123n
      return () => binding.convertBigIntInt64(value)
    }
  },
  {
    name: 'convertBigIntUint64',
    description: 'truncate a wide BigInt to uint64 and create a BigInt result',
    providers: ['c'],
    run: binding => {
      const value = (1n << 100n) + 123n
      return () => binding.convertBigIntUint64(value)
    }
  },
  {
    name: 'getBigIntWords4',
    description: 'read four uint64 words from a BigInt',
    providers: ['c'],
    operationsPerRun: 4,
    run: binding => {
      const value = (1n << 250n) + (1n << 190n) + (1n << 130n) + 123n
      return () => binding.getBigIntWords(value)
    }
  },
  {
    name: 'getLatin1Oversized',
    description: 'copy a short Latin-1 string into a 256-byte buffer',
    providers: ['c'],
    run: binding => () => binding.getLatin1Oversized('node-api')
  },
  {
    name: 'createBigIntWords4',
    description: 'create a BigInt from four uint64 words',
    providers: ['c'],
    operationsPerRun: 4,
    run: binding => () => binding.createBigIntWords()
  },
  {
    name: 'convertString',
    description: 'function (str) { return copy(str) }',
    providers: ['embind', 'c', 'cpp'],
    run: binding => () => binding.convertString('node-api')
  },
  {
    name: 'objectGet',
    description: 'function (obj) { return obj.length }',
    providers: ['embind', 'c', 'cpp'],
    run: binding => {
      const value = { length: 1 }
      return () => binding.objectGet(value)
    }
  },
  {
    name: 'objectSet',
    description: 'function (obj, key, value) { obj[key] = value }',
    providers: ['embind', 'c', 'cpp'],
    run: binding => {
      const value = { length: 1 }
      return () => binding.objectSet(value, 'length', value.length + 1)
    }
  },
  {
    name: 'handleChurn64',
    description: 'create 64 local handles in one callback',
    providers: ['c', 'cpp'],
    operationsPerRun: 64,
    run: binding => () => binding.handleChurn(64)
  },
  {
    name: 'referenceChurn64',
    description: 'create and delete 64 references in one callback',
    providers: ['c', 'cpp'],
    operationsPerRun: 64,
    run: binding => {
      const value = {}
      return () => binding.referenceChurn(value, 64)
    }
  },
  {
    name: 'sumArrayBuffer64',
    description: 'read and sum a 64-byte ArrayBuffer through Node-API',
    providers: ['c', 'cpp'],
    operationsPerRun: 64,
    run: binding => {
      const value = new ArrayBuffer(64)
      return () => binding.sumArrayBuffer(value)
    }
  },
  {
    name: 'objectTemplateAccessor64',
    description: 'read accessors from 64 ObjectTemplate instances',
    providers: ['runtime'],
    operationsPerRun: 64,
    run: binding => () => binding.readAccessors()
  },
  {
    name: 'functionTemplateCall64',
    description: 'call a V8 FunctionTemplate wrapper 64 times',
    providers: ['runtime'],
    operationsPerRun: 64,
    run: binding => () => binding.callFunctionTemplate()
  },
  {
    name: 'finalizerQueueDrain1024',
    description: 'drain 1024 pending finalizers in FIFO order',
    providers: ['runtime'],
    operationsPerRun: 1024,
    run: binding => () => binding.drainFinalizers()
  },
  {
    name: 'cleanupQueue1',
    description: 'register and drain one cleanup hook',
    providers: ['runtime'],
    run: binding => () => binding.runCleanupHooks(1)
  },
  {
    name: 'cleanupQueue16',
    description: 'register and drain 16 cleanup hooks in LIFO order',
    providers: ['runtime'],
    operationsPerRun: 16,
    run: binding => () => binding.runCleanupHooks(16)
  },
  {
    name: 'cleanupQueue1024',
    description: 'register and drain 1024 cleanup hooks in LIFO order',
    providers: ['runtime'],
    operationsPerRun: 1024,
    run: binding => () => binding.runCleanupHooks(1024)
  }
]

const selectedCases = filter ? cases.filter(testCase => filter.test(testCase.name)) : cases
if (selectedCases.length === 0) {
  throw new Error(`No benchmark case matches ${filter}`)
}

const results = []
for (const testCase of selectedCases) {
  if (!json) {
    console.log(`${testCase.name}: ${testCase.description}`)
  }
  const suite = new Benchmark.Suite(testCase.name)
  for (const providerName of testCase.providers) {
    const provider = providers[providerName]
    suite.add(provider.label, testCase.run(provider.binding), benchmarkOptions)
  }
  suite.on('cycle', event => {
    const benchmark = event.target
    const operationsPerRun = testCase.operationsPerRun ?? 1
    const result = {
      case: testCase.name,
      provider: benchmark.name,
      runsPerSecond: benchmark.hz,
      operationsPerSecond: benchmark.hz * operationsPerRun,
      operationsPerRun,
      rme: benchmark.stats.rme,
      samples: benchmark.stats.sample.length
    }
    results.push(result)
    if (!json) {
      console.log(
        `  ${benchmark.name.padEnd(12)} ${formatNumber(result.operationsPerSecond)} ops/s` +
        ` ±${result.rme.toFixed(2)}% (${result.samples} samples)`
      )
    }
  })
  suite.run({ async: false })
}

if (providers.runtime.binding.verifyFinalizerOrder() !== '0,2,1') {
  throw new Error('runtime: finalizer queue is not FIFO')
}
if (providers.runtime.binding.verifyCleanupHooks() !== 'duplicate:2,0') {
  throw new Error('runtime: cleanup queue ordering or duplicate detection failed')
}

if (json) {
  console.log(JSON.stringify({
    node: process.version,
    v8: process.versions.v8,
    benchmarkOptions,
    results
  }, null, 2))
}

async function loadProviders () {
  const [embind, cModule, cppModule] = await Promise.all([
    require('./.build/Release/embindcpp')(),
    require('./.build/Release/emnapic')(),
    require('./.build/Release/emnapicpp')()
  ])
  const runtime = require('@emnapi/runtime')
  return {
    embind: {
      label: 'embind',
      binding: embind
    },
    c: {
      label: 'emnapi-c',
      binding: cModule.emnapiInit({ context: runtime.createContext() })
    },
    cpp: {
      label: 'emnapi-cpp',
      binding: cppModule.emnapiInit({ context: runtime.createContext() })
    },
    runtime: {
      label: 'runtime',
      binding: createRuntimeAccessorBenchmark(runtime)
    }
  }
}

function createRuntimeAccessorBenchmark (runtime) {
  const context = runtime.createContext()
  const isolate = context.isolate
  const template = isolate.createObjectTemplate()
  template.setAccessor(
    'value',
    () => isolate.napiValueFromJsValue(1),
    () => 0,
    1,
    0,
    0,
    0,
    0,
    0
  )
  const instances = Array.from({ length: 64 }, () => template.newInstance(null))
  const derived = Object.create(instances[0])
  const functionTemplate = isolate.createFunctionTemplate(() => 0, 0, undefined)
  const templateFunction = functionTemplate.getFunction()
  const bridge = {
    address: 1,
    deleteEnv () {},
    setLastError () {},
    makeDynCall_vppp () { return () => {} },
    makeDynCall_vp () { return () => {} },
    abort (message) { throw new Error(message) }
  }
  const env = new runtime.NodeEnv(context, new runtime.ArrayStore(), bridge)
  const verificationEnv = new runtime.NodeEnv(context, new runtime.ArrayStore(), bridge)
  const finalizers = Array.from({ length: 1024 }, () => {
    const finalizer = new runtime.RefTracker()
    finalizer.finalize = () => {}
    return finalizer
  })
  return {
    readAccessors () {
      let sum = 0
      for (let i = 0; i < instances.length; i++) {
        sum += instances[i].value
      }
      return sum
    },
    readDerivedAccessor () {
      return derived.value
    },
    callFunctionTemplate () {
      for (let i = 0; i < 64; i++) templateFunction(i)
    },
    drainFinalizers () {
      env.pendingFinalizers = new Set(finalizers)
      env.drainFinalizerQueue()
    },
    verifyFinalizerOrder () {
      const order = []
      const items = Array.from({ length: 3 }, (_, index) => {
        const finalizer = new runtime.RefTracker()
        finalizer.finalize = () => { order.push(index) }
        return finalizer
      })
      for (const item of items) verificationEnv.enqueueFinalizer(item)
      verificationEnv.dequeueFinalizer(items[1])
      verificationEnv.enqueueFinalizer(items[1])
      verificationEnv.drainFinalizerQueue()
      return order.join(',')
    },
    runCleanupHooks (count) {
      for (let i = 0; i < count; i++) {
        context.addCleanupHook(env, () => {}, i)
      }
      context.runCleanup()
    },
    verifyCleanupHooks () {
      const order = []
      const hooks = Array.from({ length: 3 }, (_, index) => () => { order.push(index) })
      context.addCleanupHook(env, hooks[0], 0)
      context.addCleanupHook(env, hooks[1], 1)
      let duplicate = ''
      try {
        context.addCleanupHook(env, hooks[0], 0)
      } catch (_) {
        duplicate = 'duplicate:'
      }
      context.addCleanupHook(env, hooks[2], 2)
      context.removeCleanupHook(env, hooks[1], 1)
      context.runCleanup()
      return duplicate + order.join(',')
    }
  }
}

function verifyProviders (loadedProviders) {
  const value = { length: 1 }
  for (const providerName of ['embind', 'c', 'cpp']) {
    const binding = loadedProviders[providerName].binding
    if (binding.returnParam(value) !== value) {
      throw new Error(`${providerName}: returnParam failed`)
    }
    if (binding.convertInteger(7) !== 7) {
      throw new Error(`${providerName}: convertInteger failed`)
    }
    if (binding.convertString('emnapi') !== 'emnapi') {
      throw new Error(`${providerName}: convertString failed`)
    }
    if (binding.objectGet(value) !== value.length) {
      throw new Error(`${providerName}: objectGet failed`)
    }
  }
  for (const providerName of ['c', 'cpp']) {
    const binding = loadedProviders[providerName].binding
    if (binding.handleChurn(8) !== 7) {
      throw new Error(`${providerName}: handleChurn failed`)
    }
    if (binding.referenceChurn(value, 8) !== 8) {
      throw new Error(`${providerName}: referenceChurn failed`)
    }
    if (binding.sumArrayBuffer(new Uint8Array([1, 2, 3]).buffer) !== 6) {
      throw new Error(`${providerName}: sumArrayBuffer failed`)
    }
  }
  if (loadedProviders.c.binding.convertBigIntInt64((1n << 100n) + 123n) !== 123n) {
    throw new Error('emnapi-c: convertBigIntInt64 failed')
  }
  if (loadedProviders.c.binding.getBigIntWords((1n << 250n) + 1n) !== 4) {
    throw new Error('emnapi-c: getBigIntWords failed')
  }
  if (loadedProviders.c.binding.convertBigIntUint64((1n << 100n) + 123n) !== 123n) {
    throw new Error('emnapi-c: convertBigIntUint64 failed')
  }
  if (loadedProviders.c.binding.getLatin1Oversized('node-api') !== 8) {
    throw new Error('emnapi-c: getLatin1Oversized failed')
  }
  const expectedWords = 123n | (456n << 64n) | (789n << 128n) | (101112n << 192n)
  if (loadedProviders.c.binding.createBigIntWords() !== expectedWords) {
    throw new Error('emnapi-c: createBigIntWords failed')
  }
  if (loadedProviders.runtime.binding.readAccessors() !== 64) {
    throw new Error('runtime: ObjectTemplate accessor failed')
  }
  if (loadedProviders.runtime.binding.readDerivedAccessor() !== 1) {
    throw new Error('runtime: inherited ObjectTemplate accessor failed')
  }
  loadedProviders.runtime.binding.callFunctionTemplate()
  loadedProviders.runtime.binding.drainFinalizers()
}

function formatNumber (value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value)
}
