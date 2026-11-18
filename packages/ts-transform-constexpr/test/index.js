import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ModuleKind, ModuleResolutionKind } from 'typescript/sync'
import { ScriptTarget } from 'typescript/ast'
import { createTransformerFactory } from '@emnapi/ts-transform-constexpr'
import { emitWithTransformer } from '../../shared/test/transformer-harness.js'

const inputDir = join(import.meta.dirname, 'input')
const rootFiles = [
  join(inputDir, 'conditional.ts'),
  join(inputDir, 'imported-condition.ts'),
  join(inputDir, 'constexpr-runtime.ts')
]
const compilerOptions = {
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Node10,
  target: ScriptTarget.ES2021,
  noEmit: false,
  noEmitOnError: false
}

function transform (sourceFileName, options) {
  return emitWithTransformer({
    rootFiles,
    compilerOptions,
    sourceFileName: join(inputDir, sourceFileName),
    transformerFactory: createTransformerFactory,
    transformerOptions: options
  })
}

function expectOutput (name, actual) {
  const actualPath = join(import.meta.dirname, 'actual', name)
  const expectedPath = join(import.meta.dirname, 'expected', name)
  mkdirSync(join(import.meta.dirname, 'actual'), { recursive: true })
  writeFileSync(actualPath, actual, 'utf8')
  assert.equal(
    actual.replace(/\r\n/g, '\n'),
    readFileSync(expectedPath, 'utf8').replace(/\r\n/g, '\n')
  )
}

test('evaluates constexpr branches for MEMORY32', () => {
  expectOutput('memory32.js', transform('conditional.ts', { defines: { MEMORY64: 0 } }))
})

test('evaluates constexpr branches for MEMORY64', () => {
  expectOutput('memory64.js', transform('conditional.ts', { defines: { MEMORY64: 1 } }))
})

test('preserves conditional directives for Emscripten', () => {
  expectOutput('preserve.js', transform('conditional.ts', { mode: 'preserve' }))
})

test('leaves an imported constexpr function alone', () => {
  expectOutput('imported.js', transform('imported-condition.ts', { defines: { MEMORY64: 1 } }))
})
