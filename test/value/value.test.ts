import { load } from '../util'

const promise = load('value')

test('Create int32', () => {
  return promise.then(mod => {
    expect(mod.i32()).toBe(996)
    expect(mod.utf8()).toBe('utf8')
  })
})

test('Create utf8', () => {
  return promise.then(mod => {
    expect(mod.utf8()).toBe('utf8')
  })
})
