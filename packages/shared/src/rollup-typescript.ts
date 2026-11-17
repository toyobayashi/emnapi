import fs from 'node:fs'
import path from 'node:path'
import type { InputOption, Plugin, SourceMapInput } from 'rollup'
import { API, EmitOnly, ModuleKind } from 'typescript/sync'
import type { CreateSourceFileOptions, Program, RawCompilerOptions, Snapshot } from 'typescript/sync'
import * as ts from 'typescript/ast'
import { serverFS } from 'typescript/fs'
import type { FileSystemCallbacks } from 'typescript/fs'
import {
  createLegacyFactory,
  findPrintedSnippet,
  normalizeSyntheticRanges,
  type TransformationContext,
  type TransformerFactory
} from './transformer-compat.ts'

type ProgramTransformer = (program: Program) => TransformerFactory
type TransformerEntry = ProgramTransformer | { type: 'program'; factory: ProgramTransformer }

export interface RollupTypescriptOptions {
  tsconfig?: string
  compilerOptions?: RawCompilerOptions
  transformers?: {
    before?: TransformerEntry[]
  }
}

function canonicalPath (fileName: string): string {
  return path.resolve(fileName)
}

function isTypeScriptSource (fileName: string): boolean {
  return /\.(?:ts|tsx|mts|cts)$/i.test(fileName) && !/\.d\.(?:ts|mts|cts)$/i.test(fileName)
}

function getTypeScriptInputs (input: InputOption | undefined, cwd: string): string[] {
  const entries = typeof input === 'string'
    ? [input]
    : Array.isArray(input)
      ? input
      : input ? Object.values(input) : []
  return entries
    .map(fileName => fileName.split('?')[0])
    .filter(isTypeScriptSource)
    .map(fileName => canonicalPath(path.resolve(cwd, fileName)))
}

function countOccurrences (code: string, value: string): number {
  let count = 0
  let index = code.indexOf(value)
  while (index !== -1) {
    count++
    index = code.indexOf(value, index + value.length)
  }
  return count
}

function preserveEmscriptenJsDoc (api: API, sourceFile: ts.SourceFile, code: string): string {
  const available = new Map<string, number>()
  const seen = new Map<string, number>()
  const insertions: Array<{ index: number; text: string }> = []

  for (const statement of sourceFile.statements) {
    const comments = ts.getLeadingCommentRanges(sourceFile.text, statement.pos) ?? []
    const snippet = api.printer.printNode(statement)
    const index = findPrintedSnippet(code, snippet, 0)
    if (index === -1) continue

    for (const range of comments) {
      const comment = sourceFile.text.slice(range.pos, range.end)
      if (!/@(?:__\w+|deps)\b/.test(comment)) continue

      const count = (seen.get(comment) ?? 0) + 1
      seen.set(comment, count)
      let availableCount = available.get(comment)
      if (availableCount === undefined) {
        availableCount = countOccurrences(code, comment)
        available.set(comment, availableCount)
      }
      if (count <= availableCount) continue

      insertions.push({ index, text: `${comment}\n` })
    }
  }

  insertions.sort((left, right) => right.index - left.index)
  for (const insertion of insertions) {
    code = code.slice(0, insertion.index) + insertion.text + code.slice(insertion.index)
  }
  return code
}

function printTransformedFile (api: API, sourceFile: ts.SourceFile): string {
  normalizeSyntheticRanges(sourceFile)
  const annotations: Array<{ snippet: string; parentSnippet?: string; comments: any[] }> = []
  const visit = (node: ts.Node, parent?: ts.Node): void => {
    const comments = (node as any).__ts7SyntheticComments
    if (comments?.length) {
      const snippet = api.printer.printNode(node)
      const parentSnippet = parent ? api.printer.printNode(parent) : undefined
      if (snippet) annotations.push({ snippet, parentSnippet, comments })
    }
    node.forEachChild(child => visit(child, node))
  }
  visit(sourceFile)

  let code = preserveEmscriptenJsDoc(api, sourceFile, api.printer.printFile(sourceFile))
  const offsets = new Map<string, number>()
  const insertions: Array<{ index: number; text: string }> = []
  for (const annotation of annotations) {
    const context = annotation.parentSnippet ?? annotation.snippet
    const from = offsets.get(context) ?? 0
    let contextIndex = findPrintedSnippet(code, context, from)
    if (contextIndex === -1) contextIndex = findPrintedSnippet(code, context, 0)
    if (contextIndex === -1) continue

    let index = contextIndex
    if (annotation.parentSnippet) {
      const childIndex = findPrintedSnippet(annotation.parentSnippet, annotation.snippet, 0)
      if (childIndex === -1) continue
      index += childIndex
      offsets.set(context, contextIndex + context.length)
    } else {
      offsets.set(context, contextIndex + context.length)
    }

    for (const comment of annotation.comments) {
      const text = comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
        ? `//${comment.text}${comment.hasTrailingNewLine ? '\n' : ''}`
        : `/*${comment.text}*/`
      insertions.push({ index: comment.leading ? index : index + annotation.snippet.length, text })
    }
  }

  insertions.sort((left, right) => right.index - left.index)
  for (const insertion of insertions) {
    code = code.slice(0, insertion.index) + insertion.text + code.slice(insertion.index)
  }
  return code
}

function createSnapshotProgram (
  api: API,
  tsconfigPath: string,
  compilerOptions: RawCompilerOptions = {},
  inputFiles: string[] = []
): { parsed: ReturnType<API['parseConfigFile']>; snapshot: Snapshot; program: Program } {
  const parsed = api.parseConfigFile(tsconfigPath)
  const rootFiles = inputFiles.length > 0
    ? [...new Set([
        ...parsed.fileNames.filter(fileName => !isTypeScriptSource(fileName)),
        ...inputFiles
      ])]
    : parsed.fileNames
  const snapshot = api.createSnapshot({
    createPrograms: [{
      rootFiles,
      compilerOptions: {
        ...parsed.options,
        ...compilerOptions,
        noEmit: false,
        declaration: false,
        declarationMap: false,
        emitDeclarationOnly: false
      }
    }]
  })
  const program = snapshot.operation.createdPrograms?.[0]
  if (!program) {
    snapshot.dispose()
    throw new Error(`TypeScript did not create a program for ${tsconfigPath}`)
  }
  return { parsed, snapshot, program }
}

function applyTransformers (
  sourceFile: ts.SourceFile,
  program: Program,
  transformers: TransformerEntry[]
): ts.SourceFile {
  const context: TransformationContext = { factory: createLegacyFactory() }
  let result = sourceFile
  for (const entry of transformers) {
    const factory = typeof entry === 'function' ? entry(program) : entry.factory(program)
    result = factory(context)(result)
  }
  return result
}

export function rollupTypescript (options: RollupTypescriptOptions = {}): Plugin {
  const tsconfigPath = path.resolve(options.tsconfig ?? 'tsconfig.json')
  const transformedFiles = new Map<string, string>()
  const retainedSourceFiles: Array<{ dispose: () => void }> = []
  let api: API | undefined
  let originalSnapshot: Snapshot | undefined
  let snapshot: Snapshot | undefined
  let program: Program | undefined
  let parsed: ReturnType<API['parseConfigFile']> | undefined
  let inputFiles: string[] = []

  const fileSystem: FileSystemCallbacks = {
    directoryExists: serverFS.useOS,
    fileExists: serverFS.useOS,
    getAccessibleEntries: serverFS.useOS,
    readFile (fileName: string) {
      return transformedFiles.get(canonicalPath(fileName)) ?? serverFS.useOS
    },
    realpath: serverFS.useOS,
    stat: serverFS.useOS,
    writeFile: serverFS.noop,
    removeFile: serverFS.noop
  }

  const plugin: Plugin = {
    name: 'emnapi-typescript',
    options (rollupOptions) {
      inputFiles = getTypeScriptInputs(rollupOptions.input, process.cwd())
      return null
    },
    buildStart () {
      transformedFiles.clear()
      api = new API({ cwd: path.dirname(tsconfigPath), fs: fileSystem })

      const original = createSnapshotProgram(api, tsconfigPath, options.compilerOptions, inputFiles)
      parsed = original.parsed
      originalSnapshot = original.snapshot
      Object.defineProperty(original.program, '__emnapiCreateSourceFile', {
        value (fileName: string, sourceText: string, sourceOptions?: CreateSourceFileOptions) {
          const retained = api!.createSourceFile(fileName, sourceText, sourceOptions)
          retainedSourceFiles.push(retained)
          return retained.sourceFile
        }
      })

      for (const fileName of original.program.getSourceFileNames()) {
        if (!isTypeScriptSource(fileName) || fileName.split(path.sep).includes('node_modules')) continue
        const sourceFile = original.program.getSourceFile(fileName)
        if (!sourceFile || sourceFile.isDeclarationFile) continue
        const transformed = applyTransformers(sourceFile, original.program, options.transformers?.before ?? [])
        const code = printTransformedFile(api, transformed)
        transformedFiles.set(canonicalPath(fileName), code)
        this.addWatchFile(fileName)
      }

      this.addWatchFile(tsconfigPath)
      original.program.dispose()
      originalSnapshot.dispose()
      originalSnapshot = undefined

      const transformed = createSnapshotProgram(api, tsconfigPath, options.compilerOptions, inputFiles)
      snapshot = transformed.snapshot
      program = transformed.program

      const declarationOptions = options.compilerOptions ?? {}
      if (declarationOptions.declaration || declarationOptions.emitDeclarationOnly || parsed?.options.declaration || parsed?.options.emitDeclarationOnly) {
        const declarationFiles = inputFiles.length > 0
          ? inputFiles
          : program.getSourceFileNames().filter(isTypeScriptSource)
        const emitted = program.getDeclarationEmit(declarationFiles)
        if (emitted.emitSkipped) {
          this.error(`TypeScript declaration emit was skipped for ${declarationFiles.join(', ')}: ${emitted.diagnostics.map(diagnostic => diagnostic.text).join('\n')}`)
        }
        for (const [fileName, output] of emitted.outputFiles) {
          fs.mkdirSync(path.dirname(fileName), { recursive: true })
          fs.writeFileSync(fileName, output.text, 'utf8')
        }
      }
    },
    resolveId (source, importer) {
      if (!importer || !program || !parsed) return null
      const moduleKind = options.compilerOptions?.module ?? parsed.options.module ?? ModuleKind.ESNext
      const resolved = program.getResolvedModule(importer, source, moduleKind)
      const resolvedFileName = resolved?.resolvedFileName
      return resolvedFileName && transformedFiles.has(canonicalPath(resolvedFileName)) ? resolvedFileName : null
    },
    transform (_code, id) {
      if (!program) return null
      const fileName = id.split('?')[0]
      if (!transformedFiles.has(canonicalPath(fileName))) return null

      const emitted = program.getJavaScriptEmit([fileName])
      if (emitted.emitSkipped) {
        this.error(`TypeScript emit was skipped for ${fileName}: ${emitted.diagnostics.map(diagnostic => diagnostic.text).join('\n')}`)
      }

      let code: string | undefined
      let map: SourceMapInput | undefined
      for (const [outputFile, output] of emitted.outputFiles) {
        if (/\.(?:js|mjs|cjs)\.map$/i.test(outputFile)) {
          map = JSON.parse(output.text) as SourceMapInput
        } else if (/\.(?:js|mjs|cjs)$/i.test(outputFile)) {
          code = output.text
        }
      }
      if (code === undefined) this.error(`TypeScript did not emit JavaScript for ${fileName}`)
      return { code, map: map ?? null }
    },
    closeBundle () {
      for (const sourceFile of retainedSourceFiles) sourceFile.dispose()
      retainedSourceFiles.length = 0
      program?.dispose()
      originalSnapshot?.dispose()
      snapshot?.dispose()
      api?.close()
      originalSnapshot = undefined
      snapshot = undefined
      program = undefined
      parsed = undefined
      api = undefined
    }
  }
  return plugin
}

export function emitDeclarations (tsconfigPath: string, compilerOptions: RawCompilerOptions = {}): void {
  const configPath = path.resolve(tsconfigPath)
  const api = new API({ cwd: path.dirname(configPath) })
  let snapshot: Snapshot | undefined

  try {
    const parsed = api.parseConfigFile(configPath)
    snapshot = api.createSnapshot({
      createPrograms: [{
        rootFiles: parsed.fileNames,
        compilerOptions: {
          ...parsed.options,
          ...compilerOptions,
          noEmit: false,
          declaration: true,
          emitDeclarationOnly: true
        }
      }]
    })
    const program = snapshot.operation.createdPrograms?.[0]
    if (!program) throw new Error(`TypeScript did not create a program for ${configPath}`)

    const output = program.emitToString(EmitOnly.OnlyDts)
    if (output.emitSkipped) throw new Error(`TypeScript declaration emit was skipped for ${configPath}`)
    for (const [fileName, content] of output.outputFiles) {
      fs.mkdirSync(path.dirname(fileName), { recursive: true })
      fs.writeFileSync(fileName, content.text, 'utf8')
    }
  } finally {
    snapshot?.dispose()
    api.close()
  }
}
