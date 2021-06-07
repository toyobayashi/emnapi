import { load } from '../util'

const promise = load('arg')

test('Function arguments', () => {
  return promise.then(addon => {
    expect(addon.add(3, 5)).toBe(8)
  })
})
