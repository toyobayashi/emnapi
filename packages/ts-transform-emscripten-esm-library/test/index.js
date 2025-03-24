import test from 'node:test'
import { strictEqual } from 'assert'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { rollup } from 'rollup'
import { transformWithOptions as transform } from '@emnapi/ts-transform-emscripten-esm-library'

function testTransform (file) {
  const exportedFunction = join(import.meta.dirname, `input/${file}.js`)
  const exportedFunctionExpected = join(import.meta.dirname, `expected/${file}.js`)
  const actualFunctionExpected = join(import.meta.dirname, `actual/${file}.js`)
  const transformed = transform(exportedFunction, readFileSync(exportedFunction, 'utf8'))
  mkdirSync(dirname(actualFunctionExpected), { recursive: true })
  writeFileSync(actualFunctionExpected, transformed, 'utf8')
  let expected = readFileSync(exportedFunctionExpected, 'utf8')
  if (process.platform === 'win32') {
    expected = expected.replace(/\\n/g, '\\r\\n')
  }
  strictEqual(transformed, expected)
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
  strictEqual(readFileSync(config.output.file, 'utf8'), readFileSync(join(import.meta.dirname, './expected/bundle.js'), 'utf8'))
})
