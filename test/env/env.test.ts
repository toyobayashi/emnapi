import { load } from '../util'

const promise = load('env')

test('Instance Data', () => {
  return promise.then(mod => {
    expect(mod.i32()).toBe(233)
  })
})
