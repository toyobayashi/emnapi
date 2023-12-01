import { EOL } from 'os'
import ts = require('typescript')
import type { Plugin } from 'rollup'
import { createTransformerFactory } from '@emnapi/ts-transform-emscripten-esm-library'

export interface PluginOptions {
  defaultLibraryFuncsToInclude?: string[]
  exportedRuntimeMethods?: string[]
  modifyOutput?: (output: string) => string
}

function transform (fileName: string, sourceText: string): string {
  const compilerOptions = {
    allowJs: true,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    noEmit: true
  }
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
  const host = ts.createCompilerHost(compilerOptions, true)
  host.getSourceFile = filePath => filePath === fileName ? source : undefined
  const program = ts.createProgram({
    rootNames: [fileName],
    options: compilerOptions,
    host
  })

  const transformerFactory = createTransformerFactory(program)

  const transformResult = ts.transform(source, [transformerFactory])
  const printer = ts.createPrinter({
    newLine: process.platform === 'win32' ? ts.NewLineKind.CarriageReturnLineFeed : ts.NewLineKind.LineFeed
  })
  return printer.printNode(ts.EmitHint.SourceFile, transformResult.transformed[0], transformResult.transformed[0])
}

export default function (options?: PluginOptions): Plugin {
  const defaultLibraryFuncsToInclude = options?.defaultLibraryFuncsToInclude ?? []
  const exportedRuntimeMethods = options?.exportedRuntimeMethods ?? []
  const defaultModify = <T>(_: T): T => _
  const modifyOutput = options?.modifyOutput ?? defaultModify

  return {
    name: 'ts-transform-emscriten',
    renderChunk: function (code, chunk) {
      const result = transform(chunk.fileName, code)

      const prefix = [
        ...defaultLibraryFuncsToInclude
          .map(sym => `{{{ ((DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("${sym}") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("${sym}") : undefined), "") }}}`),
        ...exportedRuntimeMethods
          .map(sym => `{{{ ((EXPORTED_RUNTIME_METHODS.indexOf("${sym}") === -1 ? EXPORTED_RUNTIME_METHODS.push("${sym}") : undefined), "") }}}`)
      ].join(EOL)

      return modifyOutput(prefix + EOL + result.replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(elif)|(endif)))/g, '$1$2'))
    }
  }
}
