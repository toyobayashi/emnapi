'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const path = require('path')

const include = path.join(__dirname, 'include/node')
const includeDir = path.relative(process.cwd(), include)
const jsLibrary = path.join(__dirname, './dist/library_napi.js').replace(/\\|\\\\/g, '/')
const sources = [
  path.join(__dirname, './src/js_native_api.c'),
  path.join(__dirname, './src/node_api.c'),
  path.join(__dirname, './src/async_cleanup_hook.c'),
  path.join(__dirname, './src/async_context.c'),
  path.join(__dirname, './src/async_work.c'),
  path.join(__dirname, './src/threadsafe_function.c'),
  path.join(__dirname, './src/uv/uv-common.c'),
  path.join(__dirname, './src/uv/threadpool.c'),
  path.join(__dirname, './src/uv/unix/loop.c'),
  path.join(__dirname, './src/uv/unix/posix-hrtime.c'),
  path.join(__dirname, './src/uv/unix/thread.c'),
  path.join(__dirname, './src/uv/unix/async.c'),
  path.join(__dirname, './src/uv/unix/core.c')
]
const targets = path.relative(process.cwd(), path.join(__dirname, 'emnapi.gyp'))

exports.include = include
exports.include_dir = includeDir
exports.js_library = jsLibrary
exports.sources = sources
exports.targets = targets
