import { load } from '../util'

const promise = load('objfac')

test('Object factory', () => {
  return promise.then(addon => {
    const obj1 = addon('hello')
    const obj2 = addon('world')
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    expect(`${obj1.msg} ${obj2.msg}`).toBe('hello world')
  })
})
