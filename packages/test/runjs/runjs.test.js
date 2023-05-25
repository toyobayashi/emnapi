/* eslint-disable camelcase */
'use strict'

// Test that `napi_call_function()` returns `napi_cannot_run_js` in experimental
// mode and `napi_pending_exception` otherwise. This test calls the add-on's
// `createRef()` method, which creates a strong reference to a JS function. When
// the process exits, it calls all reference finalizers. The finalizer for the
// strong reference created herein will attempt to call `napi_get_property()` on
// a property of the global object and will abort the process if the API doesn't
// return the correct status.

const { mustNotCall } = require('../common')
const { load } = require('../util')

function runTests (addon, isVersion8) {
  addon.createRef(mustNotCall())
}

async function main () {
  const addon_v8 = await load('runjs_pe')
  const addon_new = await load('runjs_cnrj')
  function runAllTests () {
    runTests(addon_v8, /* isVersion8 */ true)
    runTests(addon_new, /* isVersion8 */ false)
  }
  runAllTests()
}

module.exports = main()
