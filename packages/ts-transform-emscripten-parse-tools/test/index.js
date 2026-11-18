import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ModuleKind, ModuleResolutionKind } from 'typescript/sync'
import { ScriptTarget } from 'typescript/ast'
import { createTransformerFactory } from '@emnapi/ts-transform-emscripten-parse-tools'
import { emitWithTransformer } from '../../shared/test/transformer-harness.js'

const inputDir = join(import.meta.dirname, 'input')
const entry = join(inputDir, 'use-parse-tools.ts')
const rootFiles = [
  entry,
  join(inputDir, 'parse-tools.d.ts'),
  join(inputDir, 'types.d.ts')
]
const compilerOptions = {
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Node10,
  target: ScriptTarget.ES2021,
  noEmit: false,
  noEmitOnError: false
}

const cases = [
  { name: 'MEMORY32 usage forms', output: 'memory32.js', options: { defines: { MEMORY64: 0 } } },
  { name: 'MEMORY64 usage forms', output: 'memory64.js', options: { defines: { MEMORY64: 1 } } },
  { name: 'plugin context used by the Emscripten build', output: 'plugin.js', options: { defines: { MEMORY64: 0 }, plugin: { contextVar: 'emnapiPluginCtx' } } }
]

function transform (options) {
  return emitWithTransformer({
    rootFiles,
    compilerOptions,
    sourceFileName: entry,
    transformerFactory: createTransformerFactory,
    transformerOptions: {
      runtimeModuleSpecifier: 'emscripten:runtime',
      parseToolsModuleSpecifier: 'emscripten:parse-tools',
      ...options
    }
  })
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
