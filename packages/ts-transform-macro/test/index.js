import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ModuleKind, ModuleResolutionKind } from 'typescript/sync'
import { ScriptTarget } from 'typescript/ast'
import { createTransformerFactory } from '@emnapi/ts-transform-macro'
import { emitWithTransformer } from '../../shared/test/transformer-harness.js'

const inputDir = join(import.meta.dirname, 'input')
const rootFiles = [
  join(inputDir, 'macros.ts'),
  join(inputDir, 'use-macros.ts'),
  join(inputDir, 'types.d.ts')
]
const compilerOptions = {
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Node10,
  target: ScriptTarget.ES2021,
  noEmit: false,
  noEmitOnError: false,
  strict: true
}

const cases = [
  { name: 'removes real macro declarations', source: 'macros.ts', output: 'macros.js' },
  { name: 'expands real macro call forms', source: 'use-macros.ts', output: 'use-macros.js' }
]

function transform (fileName) {
  const sourcePath = join(inputDir, fileName)
  return emitWithTransformer({
    rootFiles,
    compilerOptions,
    sourceFileName: sourcePath,
    transformerFactory: createTransformerFactory,
    transformerOptions: {}
  })
}

for (const { name, source, output } of cases) {
  test(`transforms actual emnapi source: ${name}`, () => {
    const actual = transform(source)
    const actualDir = join(import.meta.dirname, 'actual')
    mkdirSync(actualDir, { recursive: true })
    writeFileSync(join(actualDir, output), actual, 'utf8')
    const expected = readFileSync(join(import.meta.dirname, 'expected', output), 'utf8')
    assert.equal(actual.replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'))
  })
}
