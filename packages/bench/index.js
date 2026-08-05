/* global Benchmark, embindcpp, emnapic, emnapicpp, emnapi */

document.getElementById('testNapi').addEventListener('click', async () => {
  const [embind, cModule, cppModule] = await Promise.all([
    embindcpp(),
    emnapic(),
    emnapicpp()
  ])
  const providers = [
    ['embind', embind],
    ['emnapi-c', cModule.emnapiInit({ context: emnapi.createContext() })],
    ['emnapi-cpp', cppModule.emnapiInit({ context: emnapi.createContext() })]
  ]
  const value = { length: 1 }
  const cases = [
    ['emptyFunction', binding => () => binding.emptyFunction()],
    ['returnParam', binding => () => binding.returnParam(value)],
    ['convertInteger', binding => () => binding.convertInteger(1)],
    ['convertString', binding => () => binding.convertString('node-api')],
    ['objectGet', binding => () => binding.objectGet(value)],
    ['objectSet', binding => () => binding.objectSet(value, 'length', value.length + 1)]
  ]

  console.log(navigator.userAgent)
  for (const [caseName, createRun] of cases) {
    console.log(caseName)
    const suite = new Benchmark.Suite(caseName)
    for (const [providerName, binding] of providers) {
      suite.add(providerName, createRun(binding), { maxTime: 1, minSamples: 30 })
    }
    suite.on('cycle', event => console.log(String(event.target)))
    suite.run({ async: false })
  }
})
