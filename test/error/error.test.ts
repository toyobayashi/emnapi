import { load } from '../util'

const promise = load('error')

test('Last error info', () => {
  return promise.then(mod => {
    const ret = mod()
    expect(ret.code).toBe(1)
    expect(ret.msg).toBe('Invalid argument')
  })
})
