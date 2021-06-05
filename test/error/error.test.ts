import { getEntry } from '../util'

const wasmPromise = require(getEntry('error')).default()

test('Last error info', () => {
  return wasmPromise.then(({ Module }: { Module: any }) => {
    const ret = Module.emnapiExports()
    expect(ret.code).toBe(1)
    expect(ret.msg).toBe('Invalid argument')
  })
})
