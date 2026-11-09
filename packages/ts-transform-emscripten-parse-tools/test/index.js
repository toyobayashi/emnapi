import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { createTransformerFactory } from '@emnapi/ts-transform-emscripten-parse-tools'

const inputDir = join(import.meta.dirname, 'input')
const entry = join(inputDir, 'use-parse-tools.ts')
const program = ts.createProgram([
  entry,
  join(inputDir, 'parse-tools.d.ts'),
  join(inputDir, 'types.d.ts')
], {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  target: ts.ScriptTarget.ES2021,
  noEmit: false,
  noEmitOnError: false
})

const cases = [
  { name: 'MEMORY32 usage forms', output: 'memory32.js', options: { defines: { MEMORY64: 0 } } },
  { name: 'MEMORY64 usage forms', output: 'memory64.js', options: { defines: { MEMORY64: 1 } } },
  { name: 'plugin context used by the Emscripten build', output: 'plugin.js', options: { defines: { MEMORY64: 0 }, plugin: { contextVar: 'emnapiPluginCtx' } } }
]

function transform (options) {
  const sourceFile = program.getSourceFile(entry)
  assert.ok(sourceFile, `TypeScript Program did not include ${entry}`)
  const emitted = []
  program.emit(sourceFile, (fileName, text) => {
    emitted.push({ fileName, text })
  }, undefined, false, {
    before: [createTransformerFactory(program, {
      runtimeModuleSpecifier: 'emscripten:runtime',
      parseToolsModuleSpecifier: 'emscripten:parse-tools',
      ...options
    })]
  })
  assert.equal(emitted.length, 1)
  return emitted[0].text
}

for (const { name, output, options } of cases) {
  test(`transforms ${name}`, () => {
    const actual = transform(options)
    const actualDir = join(import.meta.dirname, 'actual')
    mkdirSync(actualDir, { recursive: true })
    writeFileSync(join(actualDir, output), actual, 'utf8')
    const expectedOutput = readFileSync(join(import.meta.dirname, 'expected', output), 'utf8')
    assert.equal(actual.replace(/\r\n/g, '\n'), expectedOutput.replace(/\r\n/g, '\n'))
  })
}
