if (typeof require === 'function') {
  // eslint-disable-next-line no-var
  var Benchmark = require('benchmark')
}

if (typeof window !== 'undefined') {
  browserMain()
} else {
  nodeMain()
}

function testEmptyFunction (embind, napi, naa) {
  const suite = new Benchmark.Suite('emptyFunction')
  // suite.add('raw#emptyFunction', function () {
  //   embind._empty_function()
  // })
  suite.add('embind#emptyFunction', function () {
    embind.emptyFunction()
  })
  suite.add('napi#emptyFunction', function () {
    napi.emptyFunction()
  })
  suite.add('naa#emptyFunction', function () {
    naa.emptyFunction()
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

function testReturnParam (embind, napi, naa) {
  const suite = new Benchmark.Suite('returnPrimitive')
  suite.add('embind#returnPrimitive', function () {
    embind.returnParam(1)
  })
  suite.add('napi#returnPrimitive', function () {
    napi.returnParam(1)
  })
  suite.add('naa#returnPrimitive', function () {
    naa.returnParam(1)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

function testConvertInteger (embind, napi, naa) {
  const suite = new Benchmark.Suite('convertInteger')
  suite.add('embind#convertInteger', function () {
    embind.convertInteger(1)
  })
  suite.add('napi#convertInteger', function () {
    napi.convertInteger(1)
  })
  suite.add('naa#convertInteger', function () {
    naa.convertInteger(1)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

function testConvertString (embind, napi, naa) {
  const suite = new Benchmark.Suite('convertString')
  suite.add('embind#convertString', function () {
    embind.convertString('node-api')
  })
  suite.add('napi#convertString', function () {
    napi.convertString('node-api')
  })
  suite.add('naa#convertString', function () {
    naa.convertString('node-api')
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

function testObjectGet (embind, napi, naa) {
  const suite = new Benchmark.Suite('ObjectGet')
  const obj = { length: 1 }
  suite.add('embind#ObjectGet', function () {
    embind.objectGet(obj)
  })
  suite.add('napi#ObjectGet', function () {
    napi.objectGet(obj)
  })
  suite.add('naa#ObjectGet', function () {
    naa.objectGet(obj)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

function testObjectSet (embind, napi, naa) {
  const suite = new Benchmark.Suite('ObjectSet')
  const obj = { length: 1 }
  suite.add('embind#ObjectSet', function () {
    embind.objectSet(obj, 'length', obj.length + 1)
  })
  suite.add('napi#ObjectSet', function () {
    napi.objectSet(obj, 'length', obj.length + 1)
  })
  suite.add('naa#ObjectSet', function () {
    naa.objectSet(obj, 'length', obj.length + 1)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
}

/* function testFib (embind, napi, naa) {
  const suite = new Benchmark.Suite('fib')
  suite.add('embind#fib', function () {
    embind.fib(24)
  })
  suite.add('napi#fib', function () {
    napi.fib(24)
  })
  suite.add('naa#fib', function () {
    naa.fib(24)
  })
  suite.on('cycle', function (event) {
    console.log(String(event.target))
  })
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  suite.run({ async: false })
} */

function browserMain () {
  Promise.all([
    window.embindcpp.default({ emnapiRuntime: window.emnapi }),
    window.emnapic.default({ emnapiRuntime: window.emnapi }),
    window.emnapicpp.default({ emnapiRuntime: window.emnapi })
  ]).then(([
    { Module: embind },
    { Module: { emnapiExports: napi } },
    { Module: { emnapiExports: naa } }
  ]) => {
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
    require('./.cgenbuild/Release/embindcpp').default({ emnapiRuntime: require('@tybys/emnapi-runtime') }),
    require('./.cgenbuild/Release/emnapic').default({ emnapiRuntime: require('@tybys/emnapi-runtime') }),
    require('./.cgenbuild/Release/emnapicpp').default({ emnapiRuntime: require('@tybys/emnapi-runtime') })
  ]).then(([
    { Module: embind },
    { Module: { emnapiExports: napi } },
    { Module: { emnapiExports: naa } }
  ]) => {
    testEmptyFunction(embind, napi, naa)
    testReturnParam(embind, napi, naa)
    testConvertInteger(embind, napi, naa)
    testConvertString(embind, napi, naa)
    testObjectGet(embind, napi, naa)
    testObjectSet(embind, napi, naa)
  })
}
