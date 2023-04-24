let emnapi, embindcpp, emnapic, emnapicpp
if (typeof require === 'function') {
  // eslint-disable-next-line no-var
  var Benchmark = require('benchmark')
  emnapi = require('@emnapi/runtime')
  embindcpp = require('./.build/Release/embindcpp')
  emnapic = require('./.build/Release/emnapic')
  emnapicpp = require('./.build/Release/emnapicpp')
} else {
  emnapi = window.emnapi
  embindcpp = window.embindcpp
  emnapic = window.emnapic
  emnapicpp = window.emnapicpp
}

const embindPrefix = '                 embind #'
const emnapiPrefix = '                 emnapi #'
const nodeaaPrefix = 'node-addon-api + emnapi #'

function testEmptyFunction (embind, napi, naa) {
  console.log('binding: function () {}')
  const name = 'emptyFunction'
  const suite = new Benchmark.Suite(name)
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

function testIncrementCounter (embind, napi, naa) {
  console.log('binding: incrementCounter () { ++counter }')
  const name = 'incrementCounter'
  const suite = new Benchmark.Suite(name)

  suite.add(embindPrefix + name, function () {
    embind.incrementCounter()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.incrementCounter()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.incrementCounter()
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

function testSumI32 (embind, napi, naa) {
  console.log('binding: sumI32 (v1 ... v9) { return v1 + ... + v9 }')
  const name = 'sumI32'
  const suite = new Benchmark.Suite(name)
  console.log(embind.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9))
  console.log(napi.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9))
  console.log(naa.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9))
  suite.add(embindPrefix + name, function () {
    embind.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9)
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

function testSumDouble (embind, napi, naa) {
  console.log('binding: sumDouble (v1 ... v9) { return v1 + ... + v9 }')
  const name = 'sumDouble'
  const suite = new Benchmark.Suite(name)
  console.log(embind.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9))
  console.log(napi.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9))
  console.log(naa.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9))
  suite.add(embindPrefix + name, function () {
    embind.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
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

function testReturnsInputI32 (embind, napi, naa) {
  console.log('binding: function (int) { return copy(int) }')
  const name = 'returnsInputI32'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.returnsInputI32(1)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.returnsInputI32(1)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.returnsInputI32(1)
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

function testReturnsInputString (embind, napi, naa) {
  console.log('binding: function (str) { return copy(str) }')
  const name = 'returnsInputString'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.returnsInputString('node-api')
  })
  suite.add(emnapiPrefix + name, function () {
    napi.returnsInputString('node-api')
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.returnsInputString('node-api')
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

function testCallback (embind, napi, naa) {
  console.log('binding: function (f) { f() }')
  const name = 'callJavaScriptFunction'
  const suite = new Benchmark.Suite(name)
  const f = () => {}
  suite.add(embindPrefix + name, function () {
    embind.callJavaScriptFunction(f)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.callJavaScriptFunction(f)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.callJavaScriptFunction(f)
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

function testCreateTypedMemoryView (embind, napi, naa) {
  console.log('binding: function () { return new Uint8Array(wasm memory) }')
  const name = 'createTypedMemoryView'
  const suite = new Benchmark.Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.createTypedMemoryView()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.createTypedMemoryView()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.createTypedMemoryView()
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

function testClassMethod (embind, napi, naa) {
  console.log('binding: class Foo { incrClassCounter () {} }')
  const name = 'Foo.prototype.incrClassCounter'
  const suite = new Benchmark.Suite(name)
  const foo1 = new embind.Foo()
  const foo2 = new napi.Foo()
  const foo3 = new naa.Foo()
  suite.add(embindPrefix + name, function () {
    foo1.incrClassCounter()
  })
  suite.add(emnapiPrefix + name, function () {
    foo2.incrClassCounter()
  })
  suite.add(nodeaaPrefix + name, function () {
    foo3.incrClassCounter()
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    foo1.delete()
    foo2.delete()
    foo3.delete()
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

function test (embind, napi, naa) {
  // testEmptyFunction(embind, napi, naa)
  // testIncrementCounter(embind, napi, naa)
  // testSumI32(embind, napi, naa)
  // testSumDouble(embind, napi, naa)
  // testReturnsInputI32(embind, napi, naa)
  // testReturnsInputString(embind, napi, naa)
  // testCallback(embind, napi, naa)
  // testCreateTypedMemoryView(embind, napi, naa)
  testClassMethod(embind, napi, naa)
  // testReturnParam(embind, napi, naa)
  // testConvertInteger(embind, napi, naa)
  // testConvertString(embind, napi, naa)
  // testObjectGet(embind, napi, naa)
  // testObjectSet(embind, napi, naa)
}

function main () {
  if (typeof require !== 'function') {
    console.log(navigator.userAgent)
    console.log('')
  }

  return Promise.all([
    embindcpp(),
    emnapic(),
    emnapicpp()
  ]).then(([
    embind,
    Module2,
    Module3
  ]) => {
    const context = emnapi.getDefaultContext()
    const napi = Module2.emnapiInit({ context })
    const naa = Module3.emnapiInit({ context })
    if (typeof require !== 'function') {
      const btnNapi = document.getElementById('testNapi')
      btnNapi.addEventListener('click', () => {
        test(embind, napi, naa)
      })
    } else {
      test(embind, napi, naa)
    }
  })
}

main()
