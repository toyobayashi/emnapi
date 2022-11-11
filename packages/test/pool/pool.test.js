'use strict'
const { load } = require('../util')

async function main () {
  const loadPromise = load('pool')
  const A = await loadPromise

  await Promise.all([undefined, undefined].map(() => A.async_method()))
}

module.exports = main()
