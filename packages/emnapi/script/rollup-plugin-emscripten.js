const { EOL } = require('os')
const ts = require('typescript')
const createTransformer = require('../transformer/out/esm.js').default

/**
 * @param {string} fileName
 * @param {string} sourceText
 * @returns {string}
 */
function transform (fileName, sourceText) {
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

  const transformerFactory = createTransformer(program)

  const transformResult = ts.transform(source, [transformerFactory])
  const printer = ts.createPrinter({
    newLine: process.platform === 'win32' ? ts.NewLineKind.CarriageReturnLineFeed : ts.NewLineKind.LineFeed
  })
  return printer.printNode(ts.EmitHint.SourceFile, transformResult.transformed[0], transformResult.transformed[0])
}

/**
 * @param {{ defaultLibraryFuncsToInclude?: string[]; exportedRuntimeMethods?: string[]; modifyOutput?: (output: string) => string }=} options
 */
exports.default = function (options) {
  const defaultLibraryFuncsToInclude = (options ? options.defaultLibraryFuncsToInclude : []) || []
  const exportedRuntimeMethods = (options ? options.exportedRuntimeMethods : []) || []
  const defaultModify = _ => _
  const modifyOutput = (options ? options.modifyOutput : defaultModify) || defaultModify

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
