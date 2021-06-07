/* eslint-disable @typescript-eslint/no-floating-promises */
import { load, getEntry } from '../util'
// import * as assert from 'assert'
import { Worker } from 'worker_threads'

const promise = load('hello')

test('Hello World', () => {
  return promise.then(binding => {
    expect(binding.hello()).toStrictEqual('world')

    return new Promise<void>((resolve, reject) => {
      const callback = (msg: string): void => {
        try {
          expect(msg).toStrictEqual('world')
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      new Worker(`
const { parentPort } = require('worker_threads');

function load (request) {
  const mod = require(request)

  return typeof mod.default === 'function' ? mod.default().then(({ Module }) => Module.emnapiExports) : Promise.resolve(mod)
}
load(${JSON.stringify(getEntry('hello'))}).then((binding) => { const msg = binding.hello(); parentPort.postMessage(msg) });
`, { eval: true, env: process.env })
        .on('message', callback)
    })
  })
})
