import { load } from '../util'

const promise = load('function')

test('Function anonymous', () => {
  return promise.then(mod => {
    expect(mod.anonymous.name).toBe('')
  })
})

test('Function name', () => {
  return promise.then(mod => {
    expect(mod.fn.name).toBe('fnName')
  })
})
