const { dirname, basename, resolve } = require('path')
const { createRequire } = require('module')

try {
  // eslint-disable-next-line no-var
  var ts = require('typescript')
} catch (_) {
  throw new Error('Please install typescript first.')
}

// fix typescript < 4.0
if (ts.classPrivateFieldGetHelper) {
  ts.classPrivateFieldGetHelper.importName = ts.classPrivateFieldGetHelper.importName || '__classPrivateFieldGet'
}
if (ts.classPrivateFieldSetHelper) {
  ts.classPrivateFieldSetHelper.importName = ts.classPrivateFieldSetHelper.importName || '__classPrivateFieldSet'
}

class TSError extends Error {
  constructor (msg, code) {
    super(msg)
    this.code = code
  }

  what () {
    return `TS${this.code}: ${this.message}`
  }
}
Object.defineProperty(TSError.prototype, 'name', {
  configurable: true,
  value: 'TSError'
})

function reportDiagnostics (diagnostics) {
  if (diagnostics.length) {
    const host = {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: _ => _,
      getNewLine: () => ts.sys.newLine
    }
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
  }
}

function parseTsConfigToCommandLine (tsconfig) {
  const configFileName = ts.findConfigFile(
    dirname(tsconfig),
    ts.sys.fileExists,
    basename(tsconfig)
  )
  if (!configFileName) {
    throw new Error(`TSConfig not found: ${tsconfig}`)
  }

  const parseConfigHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    useCaseSensitiveFileNames: true,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      reportDiagnostics([diagnostic])
      throw new TSError(diagnostic.messageText, diagnostic.code)
    }
  }

  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(configFileName, undefined, parseConfigHost, undefined, undefined, undefined)
  if (parsedCommandLine.errors.length) {
    reportDiagnostics(parsedCommandLine.errors)
    throw new TSError(parsedCommandLine.errors[0].messageText, parsedCommandLine.errors[0].code)
  }
  return parsedCommandLine
}

function getDefault (mod) {
  const esModuleDesc = Object.getOwnPropertyDescriptor(mod, '__esModule')
  if (
    esModuleDesc &&
    !esModuleDesc.enumerable &&
    !esModuleDesc.configurable &&
    !esModuleDesc.writable &&
    esModuleDesc.value === true
  ) {
    return mod.default
  }
  return mod
}

/**
 * @param {any} target
 * @param {string=} type
 * @param {Record<string, any>} config
 * @param {ts.CompilerOptions} compilerOptions
 * @param {ts.Program} program
 * @returns {ts.TransformerFactory<ts.SourceFile> | ts.CustomTransformerFactory}
 */
function getTransformer (target, type, config, compilerOptions, program) {
  if (type === undefined || type === 'program') {
    return target(program, config)
  }
  if (type === 'config') {
    return target(config)
  }
  if (type === 'checker') {
    return target(program.getTypeChecker(), config)
  }
  if (type === 'raw') {
    return target
  }
  if (type === 'compilerOptions') {
    return target(compilerOptions, config)
  }
  throw new TypeError(`Unsupport plugin type: ${type}`)
}

/**
 * @param {string} tsconfig
 * @param {ts.CompilerOptions} compilerOptions
 * @param {ts.Program} program
 * @returns {ts.CustomTransformers}
 */
function getTransformers (tsconfig, compilerOptions, program) {
  const _require = createRequire(resolve(tsconfig))
  const customTransformers = {}
  if (Array.isArray(compilerOptions.plugins)) {
    for (let i = 0; i < compilerOptions.plugins.length; ++i) {
      let plugin = compilerOptions.plugins[i]
      if (typeof plugin === 'string') plugin = { transform: plugin }
      const { transform, type, after, afterDeclarations, ...config } = plugin
      delete config.import
      const mod = _require(transform)
      const target = plugin.import ? mod[plugin.import] : getDefault(mod)
      const timing = after ? 'after' : (afterDeclarations ? 'afterDeclarations' : 'before')
      ;(customTransformers[timing] || (customTransformers[timing] = [])).push(
        getTransformer(target, type, config, compilerOptions, program)
      )
    }
  }
  return customTransformers
}

/** @typedef {{ ignoreErrorCodes?: number[]; }} TransformOptions */

/**
 * @param {string} tsconfig
 * @param {TransformOptions=} customTransformOptions
 */
function compile (tsconfig, { ignoreErrorCodes = [] } = {}) {
  const parsedCommandLine = parseTsConfigToCommandLine(tsconfig)
  const compilerHost = ts.createCompilerHost(parsedCommandLine.options)

  const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options, compilerHost)
  const customTransformers = getTransformers(tsconfig, parsedCommandLine.options, program)
  const emitResult = program.emit(undefined, undefined, undefined, !!parsedCommandLine.options.emitDeclarationOnly, customTransformers)

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  const diagnostics = allDiagnostics.filter(d => !ignoreErrorCodes.includes(d.code))
  reportDiagnostics(diagnostics)

  if (emitResult.emitSkipped && !parsedCommandLine.options.noEmit) {
    throw new Error('TypeScript compile failed.')
  }
}

function watch (tsconfig, { ignoreErrorCodes = [] } = {}) {
  const configPath = ts.findConfigFile(
    dirname(tsconfig),
    ts.sys.fileExists,
    basename(tsconfig)
  )

  if (!configPath) {
    throw new Error(`TSConfig not found: ${tsconfig}`)
  }

  function reportDiagnostic (diagnostic) {
    if (ignoreErrorCodes.includes(diagnostic.code)) return
    reportDiagnostics([diagnostic])
  }

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    ts.createSemanticDiagnosticsBuilderProgram,
    reportDiagnostic,
    reportDiagnostic
  )

  const origCreateProgram = host.createProgram
  host.createProgram = (rootNames, options, host, oldProgram) => {
    return origCreateProgram.call(this, rootNames, options, host, oldProgram)
  }

  host.afterProgramCreate = builderProgram => {
    const program = builderProgram.getProgram()
    const writeFileName = function (s) { return ts.sys.write(s + ts.sys.newLine) }
    const compilerOptions = builderProgram.getCompilerOptions()
    const newLine = ts.getNewLineCharacter(compilerOptions, function () { return ts.sys.newLine })
    const customTransformers = getTransformers(tsconfig, compilerOptions, program)
    ts.emitFilesAndReportErrors(builderProgram, reportDiagnostic, writeFileName, function (errorCount) {
      return host.onWatchStatusChange(ts.createCompilerDiagnostic(ts.getWatchErrorSummaryDiagnosticMessage(errorCount), errorCount), newLine, compilerOptions, errorCount)
    }, undefined, undefined, !!compilerOptions.emitDeclarationOnly, customTransformers)
  }

  return ts.createWatchProgram(host)
}

exports.compile = compile
exports.watch = watch
