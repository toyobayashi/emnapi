/* eslint-disable camelcase */
'use strict'
const { load } = require('../util')
const main = require('./main')

const RUNTIME_UV_THREADPOOL_SIZE = ('UV_THREADPOOL_SIZE' in process.env) ? Number(process.env.UV_THREADPOOL_SIZE) : 4
module.exports = main(load('async_st', {
  asyncWorkPoolSize: -RUNTIME_UV_THREADPOOL_SIZE
}), __filename)
