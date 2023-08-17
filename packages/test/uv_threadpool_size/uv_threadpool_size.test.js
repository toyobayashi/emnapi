'use strict'
const { load } = require('../util')

module.exports = load('uv_threadpool_size').then(({ test }) => {
  const uvThreadpoolSize = parseInt(process.env.EXPECTED_UV_THREADPOOL_SIZE ||
    process.env.UV_THREADPOOL_SIZE, 10) || 4
  test(uvThreadpoolSize)
})
