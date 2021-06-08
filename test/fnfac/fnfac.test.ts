import { load } from '../util'

const promise = load('fnfac')

test('Function factory', () => {
  return promise.then(addon => {
    const fn = addon()
    expect(fn()).toBe('hello world')
  })
})
