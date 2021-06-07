import { load } from '../util'

const promise = load('callback')

test('Test callbacks', () => {
  return promise.then(addon => {
    addon.RunCallback(function (msg: string) {
      expect(msg).toStrictEqual('hello world')
    })

    function testRecv (desiredRecv: any): void {
      addon.RunCallbackWithRecv(function (this: any) {
        'use strict'
        expect(this === desiredRecv).toBe(true)
      }, desiredRecv)
    }

    testRecv(undefined)
    testRecv(null)
    testRecv(5)
    testRecv(true)
    testRecv('Hello')
    testRecv([])
    testRecv({})
  })
})
