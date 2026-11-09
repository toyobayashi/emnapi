import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { createTransformerFactory } from '@emnapi/ts-transform-macro'

const inputDir = join(import.meta.dirname, 'input')
const program = ts.createProgram([
  join(inputDir, 'macros.ts'),
  join(inputDir, 'use-macros.ts'),
  join(inputDir, 'types.d.ts')
], {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  target: ts.ScriptTarget.ES2021,
  noEmit: false,
  noEmitOnError: false,
  strict: true
})

const cases = [
  { name: 'removes real macro declarations', source: 'macros.ts', output: 'macros.js' },
  { name: 'expands real macro call forms', source: 'use-macros.ts', output: 'use-macros.js' }
]

function transform (fileName) {
  const sourcePath = join(inputDir, fileName)
  const sourceFile = program.getSourceFile(sourcePath)
  assert.ok(sourceFile, `TypeScript Program did not include ${sourcePath}`)
  const emitted = []
  program.emit(sourceFile, (emittedFile, text) => {
    emitted.push({ emittedFile, text })
  }, undefined, false, {
    before: [createTransformerFactory(program)]
  })
  assert.equal(emitted.length, 1)
  return emitted[0].text
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
