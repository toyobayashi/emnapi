import type {
  TransformerFactory,
  SourceFile,
  Program,
  TransformationContext,
  VisitResult,
  Node,
  FunctionDeclaration,
  VariableDeclaration,
  Visitor,
  Symbol,
  JSDocTagInfo,
  ExpressionStatement,
  ObjectLiteralExpression
} from 'typescript'

import { EOL } from 'os'

import ts = require('typescript')

export interface BaseTransformOptions {
  /** @default 'emscripten:runtime' */
  runtimeModuleSpecifier?: string

  /** @default 'emscripten:parse-tools' */
  parseToolsModuleSpecifier?: string
}

interface SymbolWrap/* <T extends VariableDeclaration | FunctionDeclaration> */ {
  // decl: T
  deps: Set<VariableDeclaration | FunctionDeclaration>
  exported: Symbol | undefined
  replaceNode: Node
  jsdocTags: JSDocTagInfo[] | undefined
}

class Transformer {
  exported: Set<VariableDeclaration | FunctionDeclaration> = new Set()
  wrap: WeakMap<VariableDeclaration | FunctionDeclaration, SymbolWrap> = new WeakMap()

  private readonly _runtimeModuleSpecifier: string
  private readonly _parseToolsModuleSpecifier: string

  constructor (public ctx: TransformationContext, public program: Program, options?: BaseTransformOptions) {
    const { runtimeModuleSpecifier, parseToolsModuleSpecifier } = getDefaultBaseOptions(options)
    this._runtimeModuleSpecifier = runtimeModuleSpecifier
    this._parseToolsModuleSpecifier = parseToolsModuleSpecifier

    this.transform = this.transform.bind(this)
    this.parseToolsVisitor = this.parseToolsVisitor.bind(this)
    this.finalVisitor = this.finalVisitor.bind(this)
    this.collectExportedFunctionVisitor = this.collectExportedFunctionVisitor.bind(this)
  }

  transform (source: SourceFile): SourceFile {
    source = ts.visitNode(source, this.parseToolsVisitor) as SourceFile
    ts.visitNode(source, this.collectExportedFunctionVisitor) as SourceFile

    const result = ts.visitEachChild(source, this.finalVisitor, this.ctx)
    let statements = [
      ...result.statements.filter(s => !ts.isExportDeclaration(s)).map(s => {
        if (ts.isFunctionDeclaration(s)) {
          return this.ctx.factory.updateFunctionDeclaration(s,
            s.modifiers?.filter((m) => m.kind !== ts.SyntaxKind.ExportKeyword),
            s.asteriskToken,
            s.name,
            s.typeParameters,
            s.parameters,
            s.type,
            s.body
          )
        }
        if (ts.isVariableStatement(s)) {
          return this.ctx.factory.updateVariableStatement(s,
            s.modifiers?.filter((m) => m.kind !== ts.SyntaxKind.ExportKeyword),
            s.declarationList
          )
        }
        return s
      }),
      this.createMergeExported()
    ]

    if (this._runtimeModuleSpecifier) {
      statements = statements.filter(s => {
        return !(ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && (s.moduleSpecifier.text === this._runtimeModuleSpecifier))
      })
    }
    if (this._parseToolsModuleSpecifier) {
      statements = statements.filter(s => {
        return !(ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && (s.moduleSpecifier.text === this._parseToolsModuleSpecifier))
      })
    }
    return this.ctx.factory.updateSourceFile(result, statements)
  }

  parseToolsVisitor (node: Node): VisitResult<Node> {
    if (this._parseToolsModuleSpecifier) {
      const typeChecker = this.program.getTypeChecker()
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const d = typeChecker.getSymbolAtLocation(node.expression)?.declarations?.[0]
        if (d && ts.isImportSpecifier(d)) {
          const moduleSpecifier = d.parent.parent.parent.moduleSpecifier
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this._parseToolsModuleSpecifier) {
            return ts.addSyntheticTrailingComment(ts.addSyntheticLeadingComment(node,
              ts.SyntaxKind.MultiLineCommentTrivia, ' {{{ ', false
            ), ts.SyntaxKind.MultiLineCommentTrivia, ' }}} ', false)
          }
        }
      }
      if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isImportEqualsDeclaration(node.parent) && !ts.isImportTypeNode(node.parent)) {
        const d = typeChecker.getSymbolAtLocation(node)?.declarations?.[0]
        if (d && ts.isImportSpecifier(d)) {
          const moduleSpecifier = d.parent.parent.parent.moduleSpecifier
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this._parseToolsModuleSpecifier) {
            return ts.addSyntheticTrailingComment(ts.addSyntheticLeadingComment(node,
              ts.SyntaxKind.MultiLineCommentTrivia, ' {{{ ', false
            ), ts.SyntaxKind.MultiLineCommentTrivia, ' }}} ', false)
          }
        }
      }
      return ts.visitEachChild(node, this.parseToolsVisitor, this.ctx)
    }

    return node
  }

  finalVisitor (node: Node): VisitResult<Node> {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && this.exported.has(node)) {
      const wrap = this.wrap.get(node)!
      if (wrap.replaceNode !== node) {
        return wrap.replaceNode
      }
    }
    return ts.visitEachChild(node, this.finalVisitor, this.ctx)
  }

  tryGetExportSymbol (exportedSymbols: Symbol[], sym: Symbol): Symbol | undefined {
    const typeChecker = this.program.getTypeChecker()
    return exportedSymbols.includes(sym)
      ? sym
      : (() => {
          const index = exportedSymbols
            .map(s => {
              if (s.flags & ts.SymbolFlags.Alias) {
                return typeChecker.getAliasedSymbol(s)
              }
              return s
            })
            .indexOf(sym)
          if (index !== -1) {
            return exportedSymbols[index]
          }
          return undefined
        })()
  }

  trackDeps (decl: FunctionDeclaration | VariableDeclaration, exported: Symbol | undefined, parent: SymbolWrap | null, exportedSymbols: Symbol[]): void {
    if (parent) {
      parent.deps.add(decl)
    }
    if (this.wrap.has(decl)) {
      return
    }
    const typeChecker = this.program.getTypeChecker()
    const wrap: SymbolWrap = {
      deps: new Set(),
      exported,
      replaceNode: decl,
      jsdocTags: typeChecker.getSymbolAtLocation(decl.name!)!.getJsDocTags()
    }
    this.wrap.set(decl, wrap)

    // const syms = typeChecker.getSymbolsInScope(decl, ts.SymbolFlags.Value)
    // const functionScopedSyms = typeChecker.getSymbolsInScope(decl, ts.SymbolFlags.FunctionScopedVariable)
    const targetSymbolFlags = ts.SymbolFlags.Variable | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Enum
    const accessableSyms = ts.isFunctionDeclaration(decl)
      ? typeChecker.getSymbolsInScope(decl, targetSymbolFlags)
      : decl.initializer ? typeChecker.getSymbolsInScope(decl.initializer, targetSymbolFlags) : []

    const outScopedSyms = accessableSyms.filter((s) => {
      const valueDeclaration = s.declarations?.[0]
      if (!valueDeclaration) return false
      if (!(ts.isVariableDeclaration(valueDeclaration) || ts.isFunctionDeclaration(valueDeclaration))) {
        return false
      }
      let node: Node = valueDeclaration
      while (node && node !== decl) {
        node = node.parent
      }
      // not in scope
      return node !== decl
    }).map(s => {
      if (s.flags & ts.SymbolFlags.ExportValue) {
        return typeChecker.getExportSymbolOfSymbol(s)
      }
      return s
    })
    const outScopedAndUsedSyms = new Set<Symbol>()

    const valueVisitor: Visitor = (node) => {
      if (ts.isIdentifier(node)) {
        const symbolValue = typeChecker.getSymbolAtLocation(node)
        if (symbolValue && outScopedSyms.includes(symbolValue)) {
          outScopedAndUsedSyms.add(symbolValue)
        }
      }
      return ts.visitEachChild(node, valueVisitor, this.ctx)
    }
    ts.visitNode(decl, valueVisitor)

    // console.log(decl.getText(), [...outScopedAndUsedSyms].map(s => s.escapedName))
    outScopedAndUsedSyms.forEach(s => {
      this.handleInternalSymbol(s, wrap, exportedSymbols)
    })

    this.exported.add(decl)
    const renameVisitor: Visitor = (node) => {
      if (ts.isFunctionDeclaration(node)) {
        if (node.body) {
          return this.ctx.factory.updateFunctionDeclaration(node,
            node.modifiers?.filter((m) => m.kind !== ts.SyntaxKind.ExportKeyword),
            node.asteriskToken,
            ts.visitNode(node.name, renameVisitor) as ts.Identifier | undefined,
            node.typeParameters,
            node.parameters,
            node.type,
            ts.visitEachChild(node.body, renameVisitor, this.ctx)
          )
        }
        return node
      }
      if (ts.isIdentifier(node)) {
        const symbolValue = typeChecker.getSymbolAtLocation(node)
        if (symbolValue) {
          const exportedSym = this.tryGetExportSymbol(exportedSymbols, symbolValue)
          if (exportedSym) {
            if ((exportedSym.escapedName as string).startsWith('$')) {
              return ts.setOriginalNode(this.ctx.factory.createIdentifier((exportedSym.escapedName as string).substring(1)), node)
            }
            return ts.setOriginalNode(this.ctx.factory.createIdentifier('_' + exportedSym.escapedName), node)
          }
        }
      }
      return ts.visitEachChild(node, renameVisitor, this.ctx)
    }

    wrap.replaceNode = ts.visitNode(decl, renameVisitor)!
  }

  handleInternalSymbol (sym: Symbol, parent: SymbolWrap, exportedSymbols: Symbol[]): void {
    const decl = sym.declarations?.[0] as VariableDeclaration | FunctionDeclaration

    this.trackDeps(decl, this.tryGetExportSymbol(exportedSymbols, sym), parent, exportedSymbols)
  }

  createMergeExpressionStatement (objectLiteral: ObjectLiteralExpression): ExpressionStatement {
    const factory = this.ctx.factory
    return factory.createExpressionStatement(factory.createCallExpression(
      factory.createParenthesizedExpression(factory.createConditionalExpression(
        factory.createBinaryExpression(
          factory.createTypeOfExpression(factory.createIdentifier('addToLibrary')),
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createStringLiteral('function')
        ),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createIdentifier('addToLibrary'),
        factory.createToken(ts.SyntaxKind.ColonToken),
        factory.createArrowFunction(
          undefined,
          undefined,
          [factory.createParameterDeclaration(
            undefined,
            factory.createToken(ts.SyntaxKind.DotDotDotToken),
            factory.createIdentifier('args'),
            undefined,
            undefined,
            undefined
          )],
          undefined,
          factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          factory.createCallExpression(
            factory.createIdentifier('mergeInto'),
            undefined,
            [
              factory.createPropertyAccessExpression(
                factory.createIdentifier('LibraryManager'),
                factory.createIdentifier('library')
              ),
              factory.createSpreadElement(factory.createIdentifier('args'))
            ]
          )
        )
      )),
      undefined,
      [objectLiteral]
    ))
  }

  createMergeExported (): ExpressionStatement {
    const factory = this.ctx.factory
    return this.createMergeExpressionStatement(
      factory.createObjectLiteralExpression(
        [...this.exported].map(decl => {
          const wrap = this.wrap.get(decl)!
          const name = wrap.exported ? wrap.exported.escapedName as string : decl.name!.getText()

          // console.log(JSON.stringify(wrap.jsdocTags, null, 2))
          const map = new Map<string, string[]>()
          if (wrap.jsdocTags) {
            const emscriptenModifiers = wrap.jsdocTags.filter(info => Boolean(info.name.startsWith('__') && info.name !== '__deps' && info.text?.[0]?.text))
              .map(info => {
                let text = info.text![0].text
                if (text.startsWith('```')) {
                  text = text.match(/^```(\r?\n)*([\s\S]*?)(\r?\n)*```$/)?.[2] ?? text
                } else if (text.startsWith('`')) {
                  text = text.match(/^`([\s\S]*?)`$/)?.[1] ?? text
                } else if (text.startsWith('{')) {
                  text = text.match(/^\{([\s\S]*?)\}$/)?.[1] ?? text
                }
                return {
                  key: info.name,
                  value: text
                }
              })
            for (let i = 0; i < emscriptenModifiers.length; ++i) {
              const pair = emscriptenModifiers[i]
              if (map.has(pair.key)) {
                map.get(pair.key)!.push(pair.value)
              } else {
                map.set(pair.key, [pair.value])
              }
            }
          }

          const depsInTags = wrap.jsdocTags?.filter(info => Boolean((info.name === '__deps' || info.name === 'deps') && info.text?.[0]?.text)) ?? []

          return [
            factory.createPropertyAssignment(
              wrap.exported ? factory.createIdentifier(name) : factory.createIdentifier('$' + name),
              wrap.exported
                ? ts.isFunctionDeclaration(decl)
                  ? name.startsWith('$') ? factory.createIdentifier(name.substring(1)) : factory.createIdentifier('_' + name)
                  : decl.initializer
                    ? ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer) || ts.isObjectLiteralExpression(decl.initializer) || ts.isArrayLiteralExpression(decl.initializer)
                      ? name.startsWith('$') ? factory.createIdentifier(name.substring(1)) : factory.createIdentifier('_' + name)
                      : factory.createStringLiteral(decl.initializer.getText())
                    : factory.createIdentifier('undefined')
                : ts.isFunctionDeclaration(decl)
                  ? factory.createIdentifier(name)
                  : decl.initializer
                    ? ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer) || ts.isObjectLiteralExpression(decl.initializer) || ts.isArrayLiteralExpression(decl.initializer)
                      ? factory.createIdentifier(name)
                      : factory.createStringLiteral(decl.initializer.getText())
                    : factory.createIdentifier('undefined')
            ),
            ...((wrap.deps.size || depsInTags.length)
              ? [
                  factory.createPropertyAssignment(
                    factory.createIdentifier((wrap.exported ? name : ('$' + name)) + '__deps'),
                    factory.createArrayLiteralExpression([
                      ...[...wrap.deps].map(d => {
                        const w = this.wrap.get(d)!
                        const name = w.exported ? w.exported.escapedName as string : d.name!.getText()
                        return factory.createStringLiteral(w.exported ? name : `$${name as string}`)
                      }),
                      ...(depsInTags.map(info => {
                        return factory.createStringLiteral(info.text![0].text)
                      }))
                    ], false)
                  )
                ]
              : []),
            ...([...map.entries()].map(([m, value]) => {
              return factory.createPropertyAssignment(
                factory.createIdentifier((wrap.exported ? name : ('$' + name)) + m),
                value.length > 1
                  ? factory.createArrayLiteralExpression(value.map(v => factory.createStringLiteral(v)), false)
                  : factory.createStringLiteral(value[0])
              )
            }))
          ]
        }).flat(),
        true
      )
    )
  }

  collectExportedFunctionVisitor (source: SourceFile): VisitResult<SourceFile> {
    // disallow import declaration
    for (let i = 0; i < source.statements.length; ++i) {
      const stmt = source.statements[i]
      if (ts.isImportDeclaration(stmt)) {
        if (this._runtimeModuleSpecifier) {
          if (ts.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === this._runtimeModuleSpecifier) {
            continue
          }
        }
        if (this._parseToolsModuleSpecifier) {
          if (ts.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === this._parseToolsModuleSpecifier) {
            continue
          }
        }
        throw new Error('import declaration is not supported: ' + stmt.getText(source))
      }
    }

    const typeChecker = this.program.getTypeChecker()
    const exportedSymbols = typeChecker.getExportsOfModule(typeChecker.getSymbolAtLocation(source)!)

    for (let i = 0; i < exportedSymbols.length; ++i) {
      const exportedSymMaybeAlias = exportedSymbols[i]
      if ((exportedSymMaybeAlias.escapedName as string) === '$') {
        throw new Error('cannot export $')
      }
      const exportedSym = (exportedSymMaybeAlias.flags & ts.SymbolFlags.Alias)
        ? typeChecker.getAliasedSymbol(exportedSymMaybeAlias)
        : exportedSymMaybeAlias
      const valueDeclaration = exportedSym.declarations?.[0]
      if (!(valueDeclaration && ((ts.isFunctionDeclaration(valueDeclaration) && valueDeclaration.body) || (ts.isVariableDeclaration(valueDeclaration) && valueDeclaration.initializer)))) {
        throw new Error('Unsupported export')
      }
    }

    for (let i = 0; i < exportedSymbols.length; ++i) {
      const exportedSymMaybeAlias = exportedSymbols[i]
      const exportedSym = (exportedSymMaybeAlias.flags & ts.SymbolFlags.Alias)
        ? typeChecker.getAliasedSymbol(exportedSymMaybeAlias)
        : exportedSymMaybeAlias
      const valueDeclaration = exportedSym.declarations?.[0] as FunctionDeclaration | VariableDeclaration
      this.trackDeps(valueDeclaration, exportedSymMaybeAlias, null, exportedSymbols)
    }

    return source
  }
}

function createTransformerFactory (program: Program, options?: BaseTransformOptions): TransformerFactory<SourceFile> {
  return (context) => {
    const transformer = new Transformer(context, program, options)

    return transformer.transform
  }
}

function transform (fileName: string, sourceText: string, options?: BaseTransformOptions): string {
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

  const transformerFactory = createTransformerFactory(program, options)

  const transformResult = ts.transform(source, [transformerFactory])
  const printer = ts.createPrinter({
    newLine: process.platform === 'win32' ? ts.NewLineKind.CarriageReturnLineFeed : ts.NewLineKind.LineFeed
  })
  return printer.printNode(ts.EmitHint.SourceFile, transformResult.transformed[0], transformResult.transformed[0])
}

export interface TransformOptions extends BaseTransformOptions {
  /** @default [] */
  defaultLibraryFuncsToInclude?: string[]
  /** @default [] */
  exportedRuntimeMethods?: string[]
  /** @default true */
  processDirective?: boolean
  /** @default true */
  processParseTools?: boolean
}

function transformWithOptions (fileName: string, sourceText: string, options?: TransformOptions): string {
  const defaultLibraryFuncsToInclude = options?.defaultLibraryFuncsToInclude ?? []
  const exportedRuntimeMethods = options?.exportedRuntimeMethods ?? []
  const processDirective = options?.processDirective ?? true
  const processParseTools = options?.processParseTools ?? true

  let result = transform(fileName, sourceText, options)

  const prefix = [
    ...defaultLibraryFuncsToInclude
      .map(sym => `{{{ ((DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("${sym}") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("${sym}") : undefined), "") }}}`),
    ...exportedRuntimeMethods
      .map(sym => `{{{ ((EXPORTED_RUNTIME_METHODS.indexOf("${sym}") === -1 ? EXPORTED_RUNTIME_METHODS.push("${sym}") : undefined), "") }}}`)
  ].join(EOL)

  if (processDirective) {
    result = result.replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(elif)|(endif)))/g, '$1$2')
  }

  if (processParseTools) {
    result = result
      .replace(/\/\* \{\{\{ \*\//g, '{{{')
      .replace(/\/\* \}\}\} \*\//g, '}}}')
  }

  return prefix + (prefix ? EOL : '') + result
}

function getDefaultBaseOptions (options?: BaseTransformOptions): Required<BaseTransformOptions> {
  return {
    runtimeModuleSpecifier: options?.runtimeModuleSpecifier ?? 'emscripten:runtime',
    parseToolsModuleSpecifier: options?.parseToolsModuleSpecifier ?? 'emscripten:parse-tools'
  }
}

function getDefaultOptions (options?: TransformOptions): Required<TransformOptions> {
  return {
    ...getDefaultBaseOptions(options),
    defaultLibraryFuncsToInclude: options?.defaultLibraryFuncsToInclude ?? [],
    exportedRuntimeMethods: options?.exportedRuntimeMethods ?? [],
    processDirective: options?.processDirective ?? true,
    processParseTools: options?.processParseTools ?? true
  }
}

export { createTransformerFactory, transform, transformWithOptions, getDefaultBaseOptions, getDefaultOptions }
