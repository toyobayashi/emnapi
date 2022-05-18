const benchmark = require('benchmark')

const suite = new benchmark.Suite('emptyFunction')

Promise.all([
  require('./.cgenbuild/Release/embindcpp').default({ emnapiRuntime: require('@tybys/emnapi-runtime') }),
  require('./.cgenbuild/Release/emnapic').default({ emnapiRuntime: require('@tybys/emnapi-runtime') }),
  require('./.cgenbuild/Release/emnapicpp').default({ emnapiRuntime: require('@tybys/emnapi-runtime') })
]).then(([
  { Module: embind },
  { Module: { emnapiExports: napi } },
  { Module: { emnapiExports: naa } }
]) => {
  suite.add('raw#emptyFunction', function () {
    embind._empty_function()
  })
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
})
