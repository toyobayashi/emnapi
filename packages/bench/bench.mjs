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
    name: 'objectTemplateAccessor64',
    description: 'read accessors from 64 ObjectTemplate instances',
    providers: ['runtime'],
    operationsPerRun: 64,
    run: binding => () => binding.readAccessors()
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
  }
  if (loadedProviders.runtime.binding.readAccessors() !== 64) {
    throw new Error('runtime: ObjectTemplate accessor failed')
  }
  if (loadedProviders.runtime.binding.readDerivedAccessor() !== 1) {
    throw new Error('runtime: inherited ObjectTemplate accessor failed')
  }
}

function formatNumber (value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value)
}
