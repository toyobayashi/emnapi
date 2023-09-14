/* eslint-disable camelcase */
'use strict'
const common = require('../common')
const tick = require('util').promisify(require('../tick'))
const assert = require('assert')
const { load } = require('../util')

process.on('uncaughtException', common.mustCall((err) => {
  assert.throws(() => { throw err }, /finalizer error/)
}))

async function main () {
  const binding = await load('buffer_finalizer')

  await (async function () {
    // eslint-disable-next-line no-lone-blocks
    {
      binding.malignFinalizerBuffer(common.mustCall(() => {
        throw new Error('finalizer error')
      }))
    }
    global.gc({ type: 'minor' })
    await tick(common.platformTimeout(100))
    global.gc()
    await tick(common.platformTimeout(100))
    global.gc()
    await tick(common.platformTimeout(100))
  })().then(common.mustCall())
}

module.exports = main()
