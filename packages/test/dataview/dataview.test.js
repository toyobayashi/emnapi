/* eslint-disable no-new-object */
/* eslint-disable no-new-wrappers */
/* eslint-disable camelcase */
'use strict'
const assert = require('assert')
const { load } = require('../util')

const loadPromise = load('dataview')

module.exports = loadPromise.then(test_dataview => {
  // Test for creating dataview with ArrayBuffer
  {
    const buffer = new ArrayBuffer(128)
    const template = Reflect.construct(DataView, [buffer])

    const theDataview = test_dataview.CreateDataViewFromJSDataView(template)
    assert.ok(theDataview instanceof DataView,
            `Expect ${theDataview} to be a DataView`)
  }

  // Test for creating dataview with SharedArrayBuffer
  {
    const buffer = new SharedArrayBuffer(128)
    const template = new DataView(buffer)

    const theDataview = test_dataview.CreateDataViewFromJSDataView(template)
    assert.ok(theDataview instanceof DataView,
              `Expect ${theDataview} to be a DataView`)

    assert.strictEqual(template.buffer, theDataview.buffer)
  }

  // Test for creating dataview with invalid range
  {
    const buffer = new ArrayBuffer(128)
    assert.throws(() => {
      test_dataview.CreateDataView(buffer, 10, 200)
    }, RangeError)
  }

  // Test for creating dataview with SharedArrayBuffer and invalid range
  {
    const buffer = new SharedArrayBuffer(128)
    assert.throws(() => {
      test_dataview.CreateDataView(buffer, 10, 200)
    }, RangeError)
  }

  {
    const binding = test_dataview
    const wasmMemory = loadPromise.Module.wasmMemory
    const before = wasmMemory.buffer
    const view = binding.CreateDataView(before, 0, 4)
    if (loadPromise.Module.growMemory) {
      loadPromise.Module.growMemory(before.byteLength + 65536)
    } else {
      wasmMemory.grow(1)
    }

    const after = wasmMemory.buffer
    const cloned = binding.CreateDataViewFromJSDataView(view)

    const result = {
      trackedViewUsesCurrentBuffer: view.buffer === before,
      bufferIdentityChangedAfterGrow: before !== after,
      oldBufferLength: before.byteLength,
      newBufferLength: after.byteLength,
      returnedViewUsesOldBuffer: cloned.buffer === before,
      returnedViewUsesNewBuffer: cloned.buffer === after
    }
    console.log(result)
    assert.strictEqual(result.returnedViewUsesOldBuffer, false)
    assert.strictEqual(result.returnedViewUsesNewBuffer, true)
  }
})
