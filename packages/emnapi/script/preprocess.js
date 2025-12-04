/* eslint-disable no-cond-assign */
const path = require('path')
const fs = require('fs')
const { EOL } = require('os')

function resolveFilename (filename, dir, includePaths) {
  if (path.isAbsolute(filename)) {
    if (fs.existsSync(filename)) {
      return filename
    } else {
      return ''
    }
  }
  const absp = path.join(dir, filename)
  if (fs.existsSync(absp)) {
    return absp
  } else {
    return resolveFilenameInPaths(filename, includePaths)
  }
}

function resolveFilenameInPaths (filename, includePaths) {
  if (path.isAbsolute(filename)) {
    throw new Error('Absolute path: ' + filename)
  }

  for (let i = 0; i < includePaths.length; i++) {
    const absp = path.join(includePaths[i], filename)
    if (fs.existsSync(absp)) {
      return absp
    }
  }

  return ''
}

class Compilation {
  constructor (parser, code, dir, ifBlockStack, cache, defines) {
    this._parser = parser

    this.includePaths = (parser.options.includePaths || []).slice(0)
    this.defines = defines || JSON.parse(JSON.stringify(parser.options.defines || {}))
    this.ifBlockStack = ifBlockStack || []
    this.code = code
    this.dir = dir
    this.lines = this.code.split(/\r?\n/)
    this.cache = cache || {}
    this.currentLine = 0
  }

  output () {
    while (this.currentLine < this.lines.length) {
      const l = this._processLine(this.currentLine)
      if (l !== -1) {
        this.currentLine = l
      } else {
        this.currentLine++
      }
    }

    const processedCode = this.lines.join(EOL)

    return processedCode
  }

  _processLine (lineNumber) {
    if (!this.lines[lineNumber].match(/^\s*\/\/\s*#/)) {
      let result
      const results = []
      const reg = /%\{(\S+?)\}/g
      while ((result = reg.exec(this.lines[lineNumber])) !== null) {
        const trimmed = result[1].trim()
        results.push([result[0], trimmed])
        if (typeof this.defines[trimmed] === 'undefined') {
          throw new Error('Macro undefined: ' + this.lines[lineNumber])
        }
      }
      for (let i = 0; i < results.length; i++) {
        this.lines[lineNumber] = this.lines[lineNumber].replace(results[i][0], this.defines[results[i][1]])
      }
      if (results.length > 0) {
        return lineNumber
      }
      return -1
    }

    let matchResult = null
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#\s*$/)) return this._emptyDirective(lineNumber)
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#include\s+"(.+?)"\s*$/)) return this._includeDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#include\s+<(.+?)>\s*$/)) return this._includeDirective(lineNumber, matchResult[1], true)
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#define\s+(\S+)\s*$/)) return this._defineDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#define\s+(\S+)\s+(.+?)\s*$/)) return this._defineDirective(lineNumber, matchResult[1], matchResult[2])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#undef\s+(.+?)\s*$/)) return this._undefDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#ifdef\s+(.+?)\s*$/)) return this._ifdefDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#ifndef\s+(.+?)\s*$/)) return this._ifndefDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#if\s+(.+?)\s*$/)) return this._ifDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#elif\s+(.+?)\s*$/)) return this._elifDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#else\s*$/)) return this._elseDirective(lineNumber)
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#endif\s*$/)) return this._endifDirective(lineNumber)
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#error\s+(.+?)\s*$/)) return this._errorDirective(lineNumber, matchResult[1])
    if (matchResult = this.lines[lineNumber].match(/^\s*\/\/\s*#(region|endregion)/)) return -1

    throw new Error(`Syntax error: ${this.lines[lineNumber]}`)
  }

  _emptyDirective (lineNumber) {
    this.lines.splice(lineNumber, 1)
    return lineNumber
  }

  _includeDirective (lineNumber, request, isLib) {
    const filepath = isLib ? resolveFilenameInPaths(request, this.includePaths) : resolveFilename(request, this.dir, this.includePaths)
    if (filepath) {
      if (this.cache[filepath] !== undefined) {
        const _code = this.cache[filepath]
        const _lines = _code.split(/\r?\n/)
        this.lines.splice(lineNumber, 1, ..._lines)
        return lineNumber
      } else {
        this.cache[filepath] = ''
        const _code = new Compilation(this._parser, fs.readFileSync(filepath, 'utf8'), path.dirname(filepath), this.ifBlockStack, this.cache, this.defines).output()
        this.cache[filepath] = _code
        const _lines = _code.split(/\r?\n/)
        this.lines.splice(lineNumber, 1, ..._lines)
        return lineNumber
      }
    } else {
      throw new Error(`Can not find file: "${request}"`)
    }
  }

  _defineDirective (lineNumber, macroName, macroValue) {
    if (macroValue === undefined) {
      this.defines[macroName] = ''
      this.lines.splice(lineNumber, 1)
      return lineNumber
    } else {
      let str = macroValue
      let l = 0
      if (str.endsWith('\\')) {
        l = 1
        macroValue = macroValue.substring(0, macroValue.length - 1) + EOL + this.lines[lineNumber + l]
        while ((str = this.lines[lineNumber + l]).endsWith('\\')) {
          l++
          macroValue = macroValue.substring(0, macroValue.length - 1) + EOL + this.lines[lineNumber + l]
        }
      }
      this.defines[macroName] = macroValue
      this.lines.splice(lineNumber, 1 + l)
      return lineNumber
    }
  }

  _undefDirective (lineNumber, macroName) {
    delete this.defines[macroName]
    this.lines.splice(lineNumber, 1)
    return lineNumber
  }

  _evalCondition (/** @type {string} */ condition) {
    condition = condition.replace(/defined\((.+?)\)/g, (_substring, one) => {
      return `(${typeof this.defines[one] !== 'undefined'})`
    })
    try {
      return (new Function('context', `with (context) { return (${condition}) }`))({
        ...this.defines
      })
    } catch (_) {
      return false
    }
  }

  _ifDirective (lineNumber, condition) {
    this.ifBlockStack.push({
      type: 'IF',
      conditions: [
        {
          line: lineNumber,
          value: this._evalCondition(condition),
          code: this.lines[lineNumber]
        }
      ],
      line: lineNumber
    })
    return -1
  }

  _ifndefDirective (lineNumber, macroName) {
    this.ifBlockStack.push({
      type: 'IFNDEF',
      conditions: [
        {
          line: lineNumber,
          value: typeof this.defines[macroName] === 'undefined',
          code: this.lines[lineNumber]
        }
      ],
      line: lineNumber
    })
    return -1
  }

  _ifdefDirective (lineNumber, macroName) {
    this.ifBlockStack.push({
      type: 'IFDEF',
      conditions: [
        {
          line: lineNumber,
          value: typeof this.defines[macroName] !== 'undefined',
          code: this.lines[lineNumber]
        }
      ],
      line: lineNumber
    })
    return -1
  }

  _elifDirective (lineNumber, condition) {
    const currentIf = this.ifBlockStack.pop()
    if (currentIf === undefined || currentIf.type !== 'IF') {
      throw new Error(`Syntax error: ${this.lines[lineNumber]}`)
    }
    this.ifBlockStack.push(currentIf)
    currentIf.conditions.push({
      line: lineNumber,
      value: this._evalCondition(condition),
      code: this.lines[lineNumber]
    })
    return -1
  }

  _elseDirective (lineNumber) {
    const currentIf = this.ifBlockStack.pop()
    if (currentIf === undefined) {
      throw new Error(`Syntax error: ${this.lines[lineNumber]}`)
    }
    this.ifBlockStack.push(currentIf)
    const value = !currentIf.conditions.some(c => (c.value === true))
    currentIf.conditions.push({
      line: lineNumber,
      value,
      code: this.lines[lineNumber]
    })
    return -1
  }

  _endifDirective (lineNumber) {
    const currentIf = this.ifBlockStack.pop()
    if (currentIf === undefined) {
      throw new Error(`Syntax error: ${this.lines[lineNumber]}`)
    }
    let start = -1
    let end = -1

    for (let i = 0; i < currentIf.conditions.length; i++) {
      start = currentIf.conditions[i].line + 1
      if (currentIf.conditions[i].value) {
        if (i < currentIf.conditions.length - 1) {
          end = currentIf.conditions[i + 1].line
        } else {
          end = lineNumber
        }
        break
      }
    }
    if (end === -1) {
      this.lines.splice(currentIf.line, lineNumber - currentIf.line + 1)
      return currentIf.line
    }

    const save = this.lines.slice(start, end)
    this.lines.splice(currentIf.line, lineNumber - currentIf.line + 1, ...save)
    return currentIf.line
  }

  _errorDirective (_lineNumber, error) {
    throw new Error(`#error: ${error}`)
  }
}

class Compiler {
  constructor (options = {}) {
    this.options = options
  }

  parseCode (code, dir = process.cwd()) {
    const ifBlockStack = []
    const cache = {}
    const defines = JSON.parse(JSON.stringify(this.options.defines || {}))

    const compilation = new Compilation(this, code, dir, ifBlockStack, cache, defines)
    const res = compilation.output()
    if (ifBlockStack.length !== 0) {
      throw new Error(`Syntax error: ${ifBlockStack[0].conditions[0].code}`)
    }

    return res
  }

  parseFile (filename) {
    return this.parseCode(fs.readFileSync(filename, 'utf8'), path.dirname(filename))
  }
}

exports.Compiler = Compiler
