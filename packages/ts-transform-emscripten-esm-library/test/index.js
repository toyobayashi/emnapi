const test = require('node:test')
const { strictEqual } = require('assert')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { join, dirname } = require('path')
const { rollup } = require('rollup')
const { transformWithOptions: transform } = require('..')

function testTransform (file) {
  const exportedFunction = join(__dirname, `input/${file}.js`)
  const exportedFunctionExpected = join(__dirname, `expected/${file}.js`)
  const actualFunctionExpected = join(__dirname, `actual/${file}.js`)
  const transformed = transform(exportedFunction, readFileSync(exportedFunction, 'utf8'))
  mkdirSync(dirname(actualFunctionExpected), { recursive: true })
  writeFileSync(actualFunctionExpected, transformed, 'utf8')
  strictEqual(transformed, readFileSync(exportedFunctionExpected, 'utf8'))
}

test('exported function', () => {
  testTransform('exported-function')
})

test('external variable', () => {
  testTransform('external-variable')
})

test('exported function referenced by another one', () => {
  testTransform('exported-function-ref')
})

test('exported local variable using a local function', () => {
  testTransform('exported-var')
})

test('exporting a variable and a function with custom names', () => {
  testTransform('alias')
})

test('object literal dependencies', () => {
  testTransform('object-literal')
})

test('internal', () => {
  testTransform('internal')
})

test('directives', () => {
  testTransform('directives')
})

test('virtual modules', () => {
  testTransform('virtual-modules')
})

test('rollup', async () => {
  const config = (await import('./rollup/rollup.config.mjs')).default
  const build = await rollup(config)
  await build.write(config.output)
  strictEqual(readFileSync(config.output.file, 'utf8'), readFileSync(join(__dirname, './expected/bundle.js'), 'utf8'))
})
