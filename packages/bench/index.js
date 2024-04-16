import * as emnapi from '@emnapi/runtime'
import { Bench } from 'tinybench'
import embindcpp from './.build/Release/embindcpp.js'
import emnapic from './.build/Release/emnapic.js'
import emnapicpp from './.build/Release/emnapicpp.js'

function map (fn) {
  if (typeof fn === 'string') {
    return Array.prototype.map.call(this, (o) => o[fn])
  }
  return Array.prototype.map.call(this, fn)
}

class SuiteResult {
  constructor (task) {
    this.name = task.name
    this.ops = task.result.error ? 'NaN' : parseInt(task.result.hz.toString(), 10).toLocaleString()
    this.mean = task.result.error ? 'NaN' : task.result.mean * 1000 * 1000
    this.margin = task.result.error ? 'NaN' : `\xb1${task.result.rme.toFixed(2)}%`
    this.samples = task.result.error ? 'NaN' : task.result.samples.length
  }

  toString () {
    return `${this.name} x ${this.ops} ops/sec ${this.margin} (${this.samples} runs sampled)`
  }
}

const defaultResultConvert = (task) => new SuiteResult(task)

class Suite extends Bench {
  constructor (name, options) {
    super(options)
    this.name = name
    this.listenerMap = new Map()
  }

  on (type, listener, options) {
    const fn = function (e) {
      if (e.task) {
        const target = defaultResultConvert(e.task)
        Object.defineProperty(e, 'target', {
          configurable: true,
          enumerable: false,
          get: () => target
        })
      }
      return listener.call(this, e)
    }
    this.listenerMap.set(listener, fn)
    return super.addEventListener(type, fn, options)
  }

  off (type, listener, options) {
    return super.removeEventListener(type, this.listenerMap.get(listener), options)
  }

  /**
   * @param {'successful' | 'fastest' | 'slowest' | Function} callback
   * @returns {import('tinybench').Task[]}
   */
  filter (callback) {
    const handler = {
      get (target, p, receiver) {
        if (p === 'map') {
          return map.bind(target)
        }
        return Reflect.get(target, p, receiver)
      }
    }
    if (callback === 'successful') {
      return new Proxy(this.tasks.filter(s => s.result && !s.result.error), handler)
    }

    if (callback === 'fastest' || callback === 'slowest') {
      var result = this.filter('successful').sort(function (a, b) {
        return (a.result.mean + a.result.moe > b.result.mean + b.result.moe ? 1 : -1) * (callback === 'fastest' ? 1 : -1)
      })

      return new Proxy(result, handler)
    }
    return new Proxy(this.tasks.filter(callback), handler)
  }

  formatResults () {
    return this.tasks
      .map(defaultResultConvert)
      .map((result) => `${result.name} x ${result.ops} ops/sec ${result.margin} (${result.samples} runs sampled)`)
      .join('\n')
  }

  async run () {
    await super.warmup()
    const ret = await super.run()
    return ret
  }
}

/**
 * @param {import('stream').Writable} stream
 * @returns {(e: Event) => void}
 */
function createOnCycle (stream) {
  return function onCycle (event) {
    const result = String(event.target)
    console.log(result)
    if (stream) {
      stream.write(result + '\n')
    }
  }
}

const embindPrefix = '                 embind #'
const emnapiPrefix = '                 emnapi #'
const nodeaaPrefix = 'node-addon-api + emnapi #'
const nativeNapiPrefix = '                   napi #'
const NativeNaaPrefix = '         node-addon-api #'

async function testEmptyFunction (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function () {}')
  const name = 'emptyFunction'
  const suite = new Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.emptyFunction()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.emptyFunction()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.emptyFunction()
  })
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.emptyFunction()
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.emptyFunction()
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testIncrementCounter (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: incrementCounter () { ++counter }')
  const name = 'incrementCounter'
  const suite = new Suite(name)

  suite.add(embindPrefix + name, function () {
    embind.incrementCounter()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.incrementCounter()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.incrementCounter()
  })
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.incrementCounter()
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.incrementCounter()
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testSumI32 (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: sumI32 (v1 ... v9) { return v1 + ... + v9 }')
  const name = 'sumI32'
  const suite = new Suite(name)
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
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.sumI32(1, 2, 3, 4, 5, 6, 7, 8, 9)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testSumDouble (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: sumDouble (v1 ... v9) { return v1 + ... + v9 }')
  const name = 'sumDouble'
  const suite = new Suite(name)
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
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.sumDouble(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testReturnsInputI32 (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function (int) { return copy(int) }')
  const name = 'returnsInputI32'
  const suite = new Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.returnsInputI32(1)
  })
  suite.add(emnapiPrefix + name, function () {
    napi.returnsInputI32(1)
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.returnsInputI32(1)
  })
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.returnsInputI32(1)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.returnsInputI32(1)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testReturnsInputString (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function (str) { return copy(str) }')
  const name = 'returnsInputString'
  const suite = new Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.returnsInputString('node-api')
  })
  suite.add(emnapiPrefix + name, function () {
    napi.returnsInputString('node-api')
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.returnsInputString('node-api')
  })
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.returnsInputString('node-api')
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.returnsInputString('node-api')
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testCallback (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function (f) { f() }')
  const name = 'callJavaScriptFunction'
  const suite = new Suite(name)
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
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.callJavaScriptFunction(f)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.callJavaScriptFunction(f)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testCreateTypedMemoryView (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function () { return new Uint8Array(wasm memory) }')
  const name = 'createTypedMemoryView'
  const suite = new Suite(name)
  suite.add(embindPrefix + name, function () {
    embind.createTypedMemoryView()
  })
  suite.add(emnapiPrefix + name, function () {
    napi.createTypedMemoryView()
  })
  suite.add(nodeaaPrefix + name, function () {
    naa.createTypedMemoryView()
  })
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.createTypedMemoryView()
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.createTypedMemoryView()
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testClassMethod (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: class Foo { incrClassCounter () {} }')
  const name = 'Foo.prototype.incrClassCounter'
  const suite = new Suite(name)
  const foo1 = new embind.Foo()
  const foo2 = new napi.Foo()
  const foo3 = new naa.Foo()
  let foo4, foo5
  suite.add(embindPrefix + name, function () {
    foo1.incrClassCounter()
  })
  suite.add(emnapiPrefix + name, function () {
    foo2.incrClassCounter()
  })
  suite.add(nodeaaPrefix + name, function () {
    foo3.incrClassCounter()
  })

  if (nativeNapi && nativeNaa) {
    foo4 = new nativeNapi.Foo()
    foo5 = new nativeNaa.Foo()
    suite.add(nativeNapiPrefix + name, function () {
      foo4.incrClassCounter()
    })
    suite.add(NativeNaaPrefix + name, function () {
      foo5.incrClassCounter()
    })
  }
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
  foo1.delete()
  foo2.delete()
  foo3.delete()
  if (nativeNapi && nativeNaa) {
    foo4.delete()
    foo5.delete()
  }
}

async function testObjectGet (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function (param) { return param.length }')
  const name = 'ObjectGet'
  const suite = new Suite(name)
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
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.objectGet(obj)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.objectGet(obj)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function testObjectSet (stream, embind, napi, naa, nativeNapi, nativeNaa) {
  console.log('binding: function (obj, key, value) { obj[key] = value }')
  const name = 'ObjectSet'
  const suite = new Suite(name)
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
  suite.add(nativeNapiPrefix + name, function () {
    nativeNapi.objectSet(obj, 'length', obj.length + 1)
  })
  suite.add(NativeNaaPrefix + name, function () {
    nativeNaa.objectSet(obj, 'length', obj.length + 1)
  })
  suite.on('cycle', createOnCycle(stream))
  suite.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name')[0].trim())
    console.log('')
  })
  await suite.run()
}

async function test (...args) {
  await testEmptyFunction(...args)
  await testIncrementCounter(...args)
  await testSumI32(...args)
  await testSumDouble(...args)
  await testReturnsInputI32(...args)
  await testReturnsInputString(...args)
  await testCallback(...args)
  await testCreateTypedMemoryView(...args)
  await testClassMethod(...args)
  await testObjectGet(...args)
  await testObjectSet(...args)
}

async function main () {
  if (typeof window !== 'undefined') {
    console.log(navigator.userAgent)
    console.log('')
  }

  const [
    embind,
    Module2,
    Module3
  ] = await Promise.all([
    embindcpp(),
    emnapic(),
    emnapicpp()
  ])

  const context = emnapi.getDefaultContext()
  const napi = Module2.emnapiInit({ context })
  const naa = Module3.emnapiInit({ context })
  if (typeof window !== 'undefined') {
    const btnNapi = document.getElementById('testNapi')
    btnNapi.addEventListener('click', () => {
      test(null, embind, napi, naa)
    })
  } else {
    const { createRequire } = await import('node:module')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const { createWriteStream } = await import('node:fs')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const require = createRequire(import.meta.url)
    const ws = createWriteStream(join(__dirname, 'bench.txt'))
    await test(ws, embind, napi, naa, require('./build/Release/napi.node'), require('./build/Release/naa.node'))
    ws.close()
  }
}

main()
