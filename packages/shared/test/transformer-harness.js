import { API, ModuleKind } from 'typescript/sync'
import * as ts from 'typescript/ast'
import { serverFS } from 'typescript/fs'
import path from 'node:path'
import { createLegacyFactory, findPrintedSnippet, normalizeSyntheticRanges } from '@emnapi/shared/transformer-compat'

function printFile (api, sourceFile) {
  normalizeSyntheticRanges(sourceFile)
  const comments = []
  const visit = (node, parent) => {
    const annotations = node.__ts7SyntheticComments
    if (annotations?.length) {
      const snippet = api.printer.printNode(node)
      if (snippet) comments.push({ node, parent, snippet, parentSnippet: parent ? api.printer.printNode(parent) : undefined, annotations })
    }
    ts.visitEachChild(node, child => visit(child, node))
    return node
  }
  visit(sourceFile, undefined)

  let code = api.printer.printFile(sourceFile)
  const offsets = new Map()
  const insertions = []
  for (const { snippet, parentSnippet, annotations } of comments) {
    const context = parentSnippet ?? snippet
    const from = offsets.get(context) ?? 0
    let at = findPrintedSnippet(code, context, from)
    if (at === -1) at = findPrintedSnippet(code, context, 0)
    if (at === -1) continue
    const childOffset = parentSnippet ? findPrintedSnippet(parentSnippet, snippet, 0) : 0
    if (childOffset === -1) continue
    at += childOffset
    offsets.set(context, at + Math.max(1, context.length))
    for (const comment of annotations) {
      insertions.push({
        at: comment.leading ? at : at + snippet.length,
        text: comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
          ? `//${comment.text}${comment.hasTrailingNewLine ? '\n' : ''}`
          : `/*${comment.text}*/`
      })
    }
  }
  insertions.sort((a, b) => b.at - a.at)
  for (const insertion of insertions) {
    code = code.slice(0, insertion.at) + insertion.text + code.slice(insertion.at)
  }
  return code
}

export function emitWithTransformer ({ rootFiles, compilerOptions, sourceFileName, transformerFactory, transformerOptions }) {
  const transformedFiles = new Map()
  const retainedSourceFiles = []
  const canonical = fileName => path.resolve(fileName)
  const api = new API({
    cwd: process.cwd(),
    fs: {
      directoryExists: serverFS.useOS,
      fileExists: serverFS.useOS,
      getAccessibleEntries: serverFS.useOS,
      readFile (fileName) {
        return transformedFiles.get(canonical(fileName)) ?? serverFS.useOS
      },
      realpath: serverFS.useOS,
      stat: serverFS.useOS,
      writeFile: serverFS.noop,
      removeFile: serverFS.noop
    }
  })

  let sourceProgram
  let outputProgram
  try {
    sourceProgram = api.createProgram(rootFiles, compilerOptions)
    Object.defineProperty(sourceProgram, '__emnapiCreateSourceFile', {
      value (fileName, text, options) {
        const retained = api.createSourceFile(fileName, text, options)
        retainedSourceFiles.push(retained)
        return retained.sourceFile
      }
    })

    const transform = transformerFactory(sourceProgram, transformerOptions)({ factory: createLegacyFactory() })
    for (const fileName of rootFiles) {
      if (/\.d\.(?:ts|mts|cts)$/i.test(fileName)) continue
      const sourceFile = sourceProgram.getSourceFile(fileName)
      if (sourceFile) {
        const transformedSource = transform(sourceFile)
        let transformed = printFile(api, transformedSource)
        const hasModuleSyntax = transformedSource.statements.some(statement => {
          if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return true
          return statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
        })
        if (sourceFile.externalModuleIndicator && !hasModuleSyntax) {
          transformed += '\nexport {};\n'
        }
        transformedFiles.set(canonical(fileName), transformed)
      }
    }
    sourceProgram.dispose()
    sourceProgram = undefined

    outputProgram = api.createProgram(rootFiles, {
      ...compilerOptions,
      noEmit: false,
      declaration: false,
      declarationMap: false,
      emitDeclarationOnly: false
    })
    const output = outputProgram.getJavaScriptEmit([sourceFileName])
    if (output.emitSkipped) {
      throw new Error(output.diagnostics.map(diagnostic => String(diagnostic.messageText)).join('\n'))
    }
    for (const [fileName, item] of output.outputFiles) {
      if (/\.(?:js|mjs|cjs)$/i.test(fileName)) return item.text
    }
    throw new Error(`TypeScript did not emit JavaScript for ${sourceFileName}`)
  } finally {
    sourceProgram?.dispose()
    outputProgram?.dispose()
    for (const sourceFile of retainedSourceFiles) sourceFile.dispose()
    api.close()
  }
}
