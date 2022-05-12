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
      formatDiagnosticsWithColorAndContext([diagnostic])
      throw new TSError(diagnostic.messageText, diagnostic.code)
    }
  }

  const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(configFileName, undefined, parseConfigHost, undefined, undefined, undefined)
  if (parsedCommandLine.errors.length) {
    formatDiagnosticsWithColorAndContext(parsedCommandLine.errors)
    throw new TSError(parsedCommandLine.errors[0].messageText, parsedCommandLine.errors[0].code)
  }
  return parsedCommandLine
}

function formatDiagnosticsWithColorAndContext (diagnostics) {
  if (diagnostics.length) {
    const host = {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: createGetCanonicalFileName(true),
      getNewLine: function () { return ts.sys.newLine }
    }
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
  }
}

function logError (program, emitResult, ignoreErrorCodes = []) {
  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics)

  const diagnostics = allDiagnostics.filter(d => !ignoreErrorCodes.includes(d.code))
  formatDiagnosticsWithColorAndContext(diagnostics)
}

/** @typedef {{ ignoreErrorCodes?: number[]; }} TransformOptions */

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

function getTransformers (tsconfig, compilerOptions, program) {
  const _require = createRequire(resolve(tsconfig))
  const customTransformers = {}
  if (Array.isArray(compilerOptions.plugins)) {
    for (let i = 0; i < compilerOptions.plugins.length; ++i) {
      const plugin = compilerOptions.plugins[i]
      const config = { ...plugin }
      if (plugin.after) {
        (customTransformers.after || (customTransformers.after = [])).push(
          getDefault(_require(plugin.transform))(program, config)
        )
      } else if (plugin.afterDeclarations) {
        (customTransformers.afterDeclarations || (customTransformers.afterDeclarations = [])).push(
          getDefault(_require(plugin.transform))(program, config)
        )
      } else {
        (customTransformers.before || (customTransformers.before = [])).push(
          getDefault(_require(plugin.transform))(program, config)
        )
      }
    }
  }
  return customTransformers
}

/**
 * @param {string} tsconfig
 * @param {TransformOptions=} customTransformOptions
 */
function compile (tsconfig, customTransformOptions = {
  ignoreErrorCodes: []
}) {
  customTransformOptions = customTransformOptions || {}
  customTransformOptions.ignoreErrorCodes = customTransformOptions.ignoreErrorCodes || []

  const parsedCommandLine = parseTsConfigToCommandLine(tsconfig)
  const compilerHost = ts.createCompilerHost(parsedCommandLine.options)

  const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options, compilerHost)
  const customTransformers = getTransformers(tsconfig, parsedCommandLine.options, program)
  const emitResult = program.emit(undefined, undefined, undefined, !!parsedCommandLine.options.emitDeclarationOnly, customTransformers)

  logError(program, emitResult, customTransformOptions.ignoreErrorCodes)

  if (emitResult.emitSkipped && !parsedCommandLine.options.noEmit) {
    throw new Error('TypeScript compile failed.')
  }
}

function identity (x) { return x }

function toLowerCase (x) { return x.toLowerCase() }

const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g

function toFileNameLowerCase (x) {
  return fileNameLowerCaseRegExp.test(x)
    ? x.replace(fileNameLowerCaseRegExp, toLowerCase)
    : x
}

function createGetCanonicalFileName (useCaseSensitiveFileNames) {
  return useCaseSensitiveFileNames ? identity : toFileNameLowerCase
}

function watch (tsconfig, customTransformOptions = {
  ignoreErrorCodes: []
}) {
  customTransformOptions = customTransformOptions || {}
  customTransformOptions.ignoreErrorCodes = customTransformOptions.ignoreErrorCodes || []

  const configPath = ts.findConfigFile(
    dirname(tsconfig),
    ts.sys.fileExists,
    basename(tsconfig)
  )

  if (!configPath) {
    throw new Error(`TSConfig not found: ${tsconfig}`)
  }

  function reportDiagnostic (diagnostic) {
    if (customTransformOptions.ignoreErrorCodes.includes(diagnostic.code)) return
    formatDiagnosticsWithColorAndContext([diagnostic])
  }

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    ts.createSemanticDiagnosticsBuilderProgram,
    reportDiagnostic,
    function reportWatchStatusChanged (diagnostic) {
      if (customTransformOptions.ignoreErrorCodes.includes(diagnostic.code)) return
      formatDiagnosticsWithColorAndContext([diagnostic])
    }
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
