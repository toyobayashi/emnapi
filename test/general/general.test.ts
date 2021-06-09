import { load } from '../util'

const promise = load('general')

test('Run script', () => {
  return promise.then(addon => {
    const testCase = '(41.92 + 0.08);'
    const expected = 42
    const actual = addon.testNapiRun(testCase)

    expect(actual).toBe(expected)
    expect(() => addon.testNapiRun({ abc: 'def' })).toThrow(/string was expected/)
  })
})
