const fs = require('fs')
const path = require('path')
const crossZip = require('@tybys/cross-zip')

const root = path.join(__dirname, './out')

fs.rmSync(root, { force: true, recursive: true })

fs.mkdirSync(path.join(root, 'lib'), { recursive: true })
fs.mkdirSync(path.join(root, 'include/emnapi'), { recursive: true })
fs.mkdirSync(path.join(root, 'src'), { recursive: true })

fs.copyFileSync(path.join(__dirname, '../dist/library_napi.js'), path.join(root, 'lib', 'library_napi.js'))
fs.copyFileSync(path.join(__dirname, '../src/emnapi.c'), path.join(root, 'src', 'emnapi.c'))
fs.readdirSync(path.join(__dirname, '../include')).forEach(item => {
  if (item !== '.' && item !== '..') {
    fs.copyFileSync(path.join(__dirname, '../include', item), path.join(root, 'include/emnapi', item))
  }
})

fs.writeFileSync(path.join(root, 'CMakeLists.txt'), `cmake_minimum_required(VERSION 3.9)

project(emnapi)

add_library(emnapi STATIC "\${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi.c")

target_include_directories(emnapi PUBLIC "\${CMAKE_CURRENT_SOURCE_DIR}/include/emnapi")

target_link_options(emnapi INTERFACE "--js-library=\${CMAKE_CURRENT_SOURCE_DIR}/lib/library_napi.js")
`, 'utf8')

crossZip.zipSync(root, path.join(__dirname, 'emnapi.zip'))
fs.rmSync(root, { force: true, recursive: true })
