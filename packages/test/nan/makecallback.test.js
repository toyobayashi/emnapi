'use strict'
const assert = require('assert')
const { EventEmitter } = require('events')

module.exports = {
  target: 'nan_makecallback',
  test: function (MyObject) {
    for (const key in EventEmitter.prototype) {
      MyObject.MyObject.prototype[key] = EventEmitter.prototype[key]
    }
    const obj = new MyObject.MyObject()
    let called = false
    obj.on('event', () => { called = true })
    obj.call_emit()
    assert.ok(called)
  }
}
