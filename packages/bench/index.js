if (typeof require === 'function') {
  // eslint-disable-next-line no-var
  var Benchmark = require('benchmark')
}

const embindPrefix = '                 embind #'
const emnapiPrefix = '                 emnapi #'
const nodeaaPrefix = 'node-addon-api + emnapi #'

if (typeof window !== 'undefined') {
  browserMain()
} else {
  nodeMain()
}

function testEmptyFunction (embind, napi, naa) {
  console.log('binding: function () {}')
  const name = 'emptyFunction'
  const suite = new Benchmark.Suite(name)
  // suite.add('raw#emptyFunction', function () {
  //   embind._empty_function()
  // })
  suite.add(embindPrefix + name, function () {
    embind.emptyFunction()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.emptyFunction()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.emptyFunction()
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

function testReturnParam (embind, napi, naa) {
  console.log('binding: function (obj) { return obj }')
  const name = 'returnParam'
  const suite = new Benchmark.Suite(name)
  const param = {}
  suite.add(embindPrefix + name, function () {
    embind.returnParam(param)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.returnParam(param)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.returnParam(param)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

function testConvertInteger (embind, napi, naa) {
  console.log('binding: function (int) { return copy(int) }')
  const name = 'convertInteger'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.convertInteger(1)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.convertInteger(1)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.convertInteger(1)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

function testConvertString (embind, napi, naa) {
  console.log('binding: function (str) { return copy(str) }')
  const name = 'convertString'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.convertString('node-api')
  })
  suite.add(emnapiPrefix + name, function () {
    napi.convertString('node-api')
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.convertString('node-api')
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

function testObjectGet (embind, napi, naa) {
  console.log('binding: function (param) { return param.length }')
  const name = 'ObjectGet'
  const suite = new Benchmark.Suite(name)
  const obj = { length: 1 }
  suite.add(embindPrefix + name, function () {
    embind.objectGet(obj)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.objectGet(obj)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.objectGet(obj)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

function testObjectSet (embind, napi, naa) {
  console.log('binding: function (obj, key, value) { obj[key] = value }')
  const name = 'ObjectSet'
  const suite = new Benchmark.Suite(name)
  const obj = { length: 1 }
  suite.add(embindPrefix + name, function () {
    embind.objectSet(obj, 'length', obj.length + 1)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.objectSet(obj, 'length', obj.length + 1)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.objectSet(obj, 'length', obj.length + 1)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
}

/* function testFib (embind, napi, naa) {
  const name = 'fib'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.fib(24)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.fib(24)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.fib(24)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  suite.run({ async: false })
} */

function browserMain () {
  console.log(navigator.userAgent)
  console.log('')

  Promise.all([
    window.embindcpp.default(),
    window.emnapic.default(),
    window.emnapicpp.default()
  ]).then(([
    { Module: embind },
    { Module: Module2 },
    { Module: Module3 }
  ]) => {
    const napi = Module2.emnapiInit({ context: window.emnapi.createContext() })
    const naa = Module3.emnapiInit({ context: window.emnapi.createContext() })
    const btnNapi = document.getElementById('testNapi')
    btnNapi.addEventListener('click', () => {
      testEmptyFunction(embind, napi, naa)
      testReturnParam(embind, napi, naa)
      testConvertInteger(embind, napi, naa)
      testConvertString(embind, napi, naa)
      testObjectGet(embind, napi, naa)
      testObjectSet(embind, napi, naa)
    })
  })
}

function nodeMain () {
  Promise.all([
    require('./.cgenbuild/Release/embindcpp').default(),
    require('./.cgenbuild/Release/emnapic').default(),
    require('./.cgenbuild/Release/emnapicpp').default()
  ]).then(([
    { Module: embind },
    { Module: Module2 },
    { Module: Module3 }
  ]) => {
    const napi = Module2.emnapiInit({ context: require('@tybys/emnapi-runtime').createContext() })
    const naa = Module3.emnapiInit({ context: require('@tybys/emnapi-runtime').createContext() })
    testEmptyFunction(embind, napi, naa)
    testReturnParam(embind, napi, naa)
    testConvertInteger(embind, napi, naa)
    testConvertString(embind, napi, naa)
    testObjectGet(embind, napi, naa)
    testObjectSet(embind, napi, naa)
  })
}
