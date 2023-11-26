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

exports.default = function () {
  return {
    name: 'ts-transform-emscriten',
    renderChunk: function (code, chunk) {
      return transform(chunk.fileName, code)
    }
  }
}
