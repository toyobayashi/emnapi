import { getEntry } from '../util'

const wasmPromise = require(getEntry('value')).default()

test('Create int32', () => {
  return wasmPromise.then(({ Module }: { Module: any }) => {
    expect(Module.emnapiExports.i32()).toBe(996)
    expect(Module.emnapiExports.utf8()).toBe('utf8')
  })
})

test('Create utf8', () => {
  return wasmPromise.then(({ Module }: { Module: any }) => {
    expect(Module.emnapiExports.utf8()).toBe('utf8')
  })
})
