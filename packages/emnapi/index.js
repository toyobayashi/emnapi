'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const path = require('path')

const include = path.join(__dirname, 'include')
const includeDir = path.relative(process.cwd(), include)
const jsLibrary = path.join(__dirname, './dist/library_napi.js')
const sources = [
  path.join(__dirname, './src/emnapi.c'),
  path.join(__dirname, './src/uv/uv-common.c'),
  path.join(__dirname, './src/uv/threadpool.c'),
  path.join(__dirname, './src/uv/unix/loop.c'),
  path.join(__dirname, './src/uv/unix/thread.c'),
  path.join(__dirname, './src/uv/unix/async.c'),
  path.join(__dirname, './src/uv/unix/core.c')
]

exports.include = include
exports.include_dir = includeDir
exports.js_library = jsLibrary
exports.sources = sources
