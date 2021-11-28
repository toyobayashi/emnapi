'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const path = require('path')

const include = path.join(__dirname, 'include')
const includeDir = path.relative(process.cwd(), include)
const jsLibrary = path.join(__dirname, './dist/library_napi.js')
const sources = [
  path.join(__dirname, './src/emnapi.c')
]

exports.include = include
exports.include_dir = includeDir
exports.js_library = jsLibrary
exports.sources = sources
