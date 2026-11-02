'use strict'

const { load } = require('../util.mjs')
const common = require('../common')

module.exports = load('tsfn_shutdown_multi_thread_count_release', {
  nodeBinding: require('@emnapi/node-binding')
}).then((run) => {
  // The finalizer must run once after all thread counts are released.
  run(false, common.mustCall())

  // Abort plus calls rejected with napi_closing must release the full count.
  run(true, common.mustCall())
})
