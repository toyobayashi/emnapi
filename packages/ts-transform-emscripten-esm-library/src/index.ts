import type {
  SourceFile,
  Node,
  Identifier,
  FunctionDeclaration,
  VariableDeclaration,
  ExpressionStatement,
  ObjectLiteralExpression
} from 'typescript/ast'

import type { Program, Symbol, JSDocTagInfo } from 'typescript/sync'
import { API, ModuleKind, SymbolFlags } from 'typescript/sync'
import { serverFS } from 'typescript/fs'

import { EOL } from 'os'
import path from 'path'

import * as tsAst from 'typescript/ast'
import {
  createLegacyFactory,
  createSyntheticCommentStore,
  createTsCompat,
  findPrintedSnippet,
  normalizeSyntheticRanges,
  preserveNodeMetadata,
  sameSymbol,
  setOriginalNode,
  getTypeChecker,
  resolveDeclaration,
  type TransformationContext,
  type TransformerFactory,
  type VisitResult,
  type Visitor
} from '@emnapi/shared/transformer-compat'

const syntheticComments = createSyntheticCommentStore()
const getSyntheticComments = syntheticComments.get
const ts = createTsCompat({
  ModuleKind,
  SymbolFlags,
  addSyntheticLeadingComment: syntheticComments.addLeading,
  addSyntheticTrailingComment: syntheticComments.addTrailing,
  setOriginalNode
}, preserveNodeMetadata)

function addParseToolsComments<T extends Node> (node: T): T {
  const anchor = ts.isCallExpression(node) ? 'direct' : 'context'
  syntheticComments.add(node, ts.SyntaxKind.MultiLineCommentTrivia, ' {{{ ', true, false, { parseTools: anchor })
  return syntheticComments.add(node, ts.SyntaxKind.MultiLineCommentTrivia, ' }}} ', false, false, { parseTools: anchor })
}

function stripJavaScriptTypes (sourceFile: SourceFile): SourceFile {
  const factory = tsAst.factory
  const updateParameters = (parameters: readonly any[]) => parameters.map(parameter => {
    if (!parameter.type) return parameter
    return preserveNodeMetadata(factory.updateParameterDeclaration(
      parameter,
      parameter.modifiers,
      parameter.dotDotDotToken,
      parameter.name,
      parameter.questionToken,
      undefined,
      parameter.initializer
    ), parameter)
  })
  const visit = (node: Node): Node => {
    const children = tsAst.visitEachChild(node, visit as tsAst.Visitor)
    if (tsAst.isFunctionDeclaration(children) && children.type) {
      return preserveNodeMetadata(factory.updateFunctionDeclaration(children, children.modifiers, children.asteriskToken, children.name, children.typeParameters, updateParameters(children.parameters), undefined, children.body), children)
    }
    if (tsAst.isFunctionExpression(children) && children.type) {
      return preserveNodeMetadata(factory.updateFunctionExpression(children, children.modifiers, children.asteriskToken, children.name, children.typeParameters, updateParameters(children.parameters), undefined, children.body), children)
    }
    if (tsAst.isArrowFunction(children) && (children.type || children.parameters.some(parameter => parameter.type))) {
      return preserveNodeMetadata(factory.updateArrowFunction(children, children.modifiers, children.typeParameters, updateParameters(children.parameters), undefined, children.equalsGreaterThanToken, children.body), children)
    }
    if (tsAst.isMethodDeclaration(children) && children.type) {
      return preserveNodeMetadata(factory.updateMethodDeclaration(children, children.modifiers, children.asteriskToken, children.name, children.postfixToken, children.typeParameters, updateParameters(children.parameters), undefined, children.body), children)
    }
    return preserveNodeMetadata(children, node)
  }
  return visit(sourceFile) as SourceFile
}

function printWithParseToolsComments (api: API, sourceFile: SourceFile): string {
  normalizeSyntheticRanges(sourceFile)
  const annotations: Array<{ snippet: string; parentSnippet?: string; comments: any[] }> = []
  const visit = (node: Node, parent?: Node): Node => {
    const comments = getSyntheticComments(node)
    if (comments?.length) {
      const snippet = api.printer.printNode(node)
      const parentSnippet = parent ? api.printer.printNode(parent) : undefined
      if (snippet) annotations.push({ snippet, parentSnippet, comments })
    }
    tsAst.visitEachChild(node, child => {
      visit(child, node)
      return child
    })
    return node
  }
  visit(sourceFile)

  let output = api.printer.printFile(sourceFile)
  const offsets = new Map<string, number>()
  const insertions: Array<{ at: number; text: string }> = []
  for (const annotation of annotations) {
    const parseToolsAnchor = annotation.comments.find(comment => comment.parseTools)?.parseTools
    const useParent = parseToolsAnchor === 'context' && Boolean(annotation.parentSnippet)
    const context = useParent ? annotation.parentSnippet! : annotation.snippet
    let snippetLength = annotation.snippet.length
    let startAt = offsets.get(context) ?? 0
    let at = findPrintedSnippet(output, context, startAt)
    if (at === -1) at = findPrintedSnippet(output, context, 0)
    if (at === -1) {
      const match = findPrintedSnippetIgnoringComments(output, context, startAt)
      if (match) {
        at = match.index
        if (!useParent) snippetLength = match.length
      }
    }
    if (at === -1) {
      const match = findPrintedSnippetIgnoringComments(output, context, 0)
      if (match) {
        at = match.index
        if (!useParent) snippetLength = match.length
      }
    }
    if (at === -1) continue
    if (useParent) {
      const childAt = findPrintedSnippet(context, annotation.snippet, 0)
      if (childAt === -1) continue
      at += childAt
    }
    offsets.set(context, at + Math.max(1, context.length))
    for (const comment of annotation.comments) {
      const text = comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
        ? `//${comment.text}${comment.hasTrailingNewLine ? '\n' : ''}`
        : `/*${comment.text}*/`
      insertions.push({ at: comment.leading ? at : at + snippetLength, text })
    }
  }
  insertions.sort((a, b) => b.at - a.at)
  for (const insertion of insertions) {
    output = output.slice(0, insertion.at) + insertion.text + output.slice(insertion.at)
  }
  return output
}

function findPrintedSnippetIgnoringComments (code: string, snippet: string, from: number): { index: number; length: number } | undefined {
  const tokens = snippet.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|=>|\?\?|\.\.\.|[^\s]/g)
  if (!tokens?.length) return undefined
  const escape = (token: string) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const separator = '(?:\\s|/\\*[\\s\\S]*?\\*/|//[^\\r\\n]*(?:\\r?\\n|$))*'
  const pattern = new RegExp(tokens.map(escape).join(separator), 'g')
  pattern.lastIndex = from
  const isWord = (char: string | undefined) => char !== undefined && /[A-Za-z0-9_$]/.test(char)
  let match: RegExpExecArray | null
  while ((match = pattern.exec(code))) {
    const start = match.index
    const end = start + match[0].length
    if (!isWord(code[start - 1]) && !isWord(code[end])) return { index: start, length: match[0].length }
  }
  return undefined
}

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
  jsdocTags: readonly JSDocTagInfo[] | undefined
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
    ts.visitNode(source, this.collectExportedFunctionVisitor as any)

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
      const typeChecker = getTypeChecker(this.program)
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const d = resolveDeclaration(typeChecker.getSymbolAtLocation(node.expression)?.declarations?.[0], this.program)
        if (d && ts.isImportSpecifier(d)) {
          const moduleSpecifier = (d.parent.parent.parent as any).moduleSpecifier
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this._parseToolsModuleSpecifier) {
            return addParseToolsComments(node)
          }
        }
      }
      const parent = node.parent
      if (ts.isIdentifier(node) && parent && !ts.isImportSpecifier(parent) && !ts.isImportClause(parent) && !ts.isImportEqualsDeclaration(parent) && !ts.isImportTypeNode(parent)) {
        let ancestor: Node | undefined = parent
        while (ancestor) {
          if (ts.isCallExpression(ancestor) && ts.isIdentifier(ancestor.expression)) {
            const declaration = resolveDeclaration(typeChecker.getSymbolAtLocation(ancestor.expression)?.declarations?.[0], this.program)
            if (declaration && ts.isImportSpecifier(declaration)) {
              const moduleSpecifier = (declaration.parent.parent.parent as any).moduleSpecifier
              if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this._parseToolsModuleSpecifier) return node
            }
          }
          ancestor = ancestor.parent
        }
        const d = resolveDeclaration(typeChecker.getSymbolAtLocation(node)?.declarations?.[0], this.program)
        if (d && ts.isImportSpecifier(d)) {
          const moduleSpecifier = (d.parent.parent.parent as any).moduleSpecifier
          if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this._parseToolsModuleSpecifier) {
            return addParseToolsComments(node)
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

  tryGetExportSymbol (exportedSymbols: readonly Symbol[], sym: Symbol): Symbol | undefined {
    const typeChecker = getTypeChecker(this.program)
    return exportedSymbols.some(s => sameSymbol(s, sym))
      ? sym
      : (() => {
          const index = exportedSymbols
            .map(s => {
              if (s.flags & ts.SymbolFlags.Alias) {
                return typeChecker.getAliasedSymbol(s)
              }
              return s
            })
            .findIndex(s => sameSymbol(s, sym))
          if (index !== -1) {
            return exportedSymbols[index]
          }
          return undefined
        })()
  }

  trackDeps (decl: FunctionDeclaration | VariableDeclaration, exported: Symbol | undefined, parent: SymbolWrap | null, exportedSymbols: readonly Symbol[]): void {
    if (parent) {
      parent.deps.add(decl)
    }
    if (this.wrap.has(decl)) {
      return
    }
    const typeChecker = getTypeChecker(this.program)
    const wrap: SymbolWrap = {
      deps: new Set(),
      exported,
      replaceNode: decl,
      jsdocTags: typeChecker.getSymbolAtLocation(decl.name!)!.getJsDocTags(typeChecker)
    }
    this.wrap.set(decl, wrap)

    // const syms = typeChecker.getSymbolsInScope(decl, ts.SymbolFlags.Value)
    // const functionScopedSyms = typeChecker.getSymbolsInScope(decl, ts.SymbolFlags.FunctionScopedVariable)
    const targetSymbolFlags = ts.SymbolFlags.Variable | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Enum
    const accessableSyms = ts.isFunctionDeclaration(decl)
      ? typeChecker.getSymbolsInScope(decl, targetSymbolFlags)
      : decl.initializer ? typeChecker.getSymbolsInScope(decl.initializer, targetSymbolFlags) : []

    const outScopedSyms = accessableSyms.filter((s) => {
      const valueDeclaration = resolveDeclaration(s.declarations?.[0], this.program)
      if (!valueDeclaration) return false
      const sourceFile = valueDeclaration.getSourceFile()
      if (this.program.isSourceFileDefaultLibrary(sourceFile) || this.program.isSourceFileFromExternalLibrary(sourceFile)) return false
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
        if (symbolValue && outScopedSyms.some(s => sameSymbol(s, symbolValue))) {
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
            node.name ? (ts.visitNode(node.name, renameVisitor) as Identifier | undefined) ?? node.name : undefined,
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
    if (wrap.replaceNode !== decl && wrap.replaceNode.pos < 0) {
      ;(wrap.replaceNode as any).pos = decl.pos
      ;(wrap.replaceNode as any).end = decl.end
    }
  }

  handleInternalSymbol (sym: Symbol, parent: SymbolWrap, exportedSymbols: readonly Symbol[]): void {
    const decl = resolveDeclaration(sym.declarations?.[0], this.program) as VariableDeclaration | FunctionDeclaration | undefined
    if (!decl) return

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
            const emscriptenModifiers = wrap.jsdocTags.filter(info => Boolean(info.name.startsWith('__') && info.name !== '__deps' && info.text))
              .map(info => {
                let text = info.text!
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

          const depsInTags = wrap.jsdocTags?.filter(info => Boolean((info.name === '__deps' || info.name === 'deps') && info.text)) ?? []

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
                        return factory.createStringLiteral(info.text!)
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

    const typeChecker = getTypeChecker(this.program)
    const exportedSymbols = typeChecker.getExportsOfModule(typeChecker.getSymbolAtLocation(source)!)

    for (let i = 0; i < exportedSymbols.length; ++i) {
      const exportedSymMaybeAlias = exportedSymbols[i]
      if ((exportedSymMaybeAlias.escapedName as string) === '$') {
        throw new Error('cannot export $')
      }
      const exportedSym = (exportedSymMaybeAlias.flags & ts.SymbolFlags.Alias)
        ? typeChecker.getAliasedSymbol(exportedSymMaybeAlias)
        : exportedSymMaybeAlias
      const valueDeclaration = resolveDeclaration(exportedSym.declarations?.[0], this.program)
      if (!(valueDeclaration && ((ts.isFunctionDeclaration(valueDeclaration) && valueDeclaration.body) || (ts.isVariableDeclaration(valueDeclaration) && valueDeclaration.initializer)))) {
        throw new Error('Unsupported export')
      }
    }

    for (let i = 0; i < exportedSymbols.length; ++i) {
      const exportedSymMaybeAlias = exportedSymbols[i]
      const exportedSym = (exportedSymMaybeAlias.flags & ts.SymbolFlags.Alias)
        ? typeChecker.getAliasedSymbol(exportedSymMaybeAlias)
        : exportedSymMaybeAlias
      const valueDeclaration = resolveDeclaration(exportedSym.declarations?.[0], this.program) as FunctionDeclaration | VariableDeclaration | undefined
      if (!valueDeclaration) throw new Error('Unsupported export')
      this.trackDeps(valueDeclaration, exportedSymMaybeAlias, null, exportedSymbols)
    }

    return source
  }
}

function createTransformerFactory (program: Program, options?: BaseTransformOptions): TransformerFactory {
  return (context) => {
    const transformer = new Transformer(context, program, options)

    return transformer.transform
  }
}

function transform (fileName: string, sourceText: string, options?: BaseTransformOptions): string {
  const normalizedFileName = path.resolve(fileName)
  const compilerOptions = {
    allowJs: true,
    module: ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    noEmit: true,
    checkJs: false
  }
  const api = new API({
    cwd: path.dirname(normalizedFileName),
    fs: {
      directoryExists: serverFS.useOS,
      fileExists (pathName: string) {
        return path.resolve(pathName) === normalizedFileName ? true : serverFS.useOS
      },
      getAccessibleEntries: serverFS.useOS,
      readFile (pathName: string) {
        return path.resolve(pathName) === normalizedFileName ? sourceText : serverFS.useOS
      },
      realpath (pathName: string) {
        return path.resolve(pathName) === normalizedFileName ? normalizedFileName : serverFS.useOS
      },
      stat (pathName: string) {
        return path.resolve(pathName) === normalizedFileName
          ? { mode: 0o100644, size: Buffer.byteLength(sourceText), mtime: new Date() }
          : serverFS.useOS
      },
      writeFile: serverFS.noop,
      removeFile: serverFS.noop
    }
  })
  const program = api.createProgram([normalizedFileName], compilerOptions)
  try {
    const source = program.getSourceFile(normalizedFileName)
    if (!source) throw new Error(`TypeScript did not load ${normalizedFileName}`)
    const transformer = createTransformerFactory(program, options)({ factory: createLegacyFactory() })
    const transformed = transformer(source)
    return printWithParseToolsComments(api, source.scriptKind === tsAst.ScriptKind.JS ? stripJavaScriptTypes(transformed) : transformed)
  } finally {
    program.dispose()
    api.close()
  }
}

export interface TransformOptions extends BaseTransformOptions {
  /** @default [] */
  defaultLibraryFuncsToInclude?: string[]
  /** @default [] */
  exportedRuntimeMethods?: string[]
  /** @default true */
  processParseTools?: boolean
}

function transformWithOptions (fileName: string, sourceText: string, options?: TransformOptions): string {
  const defaultLibraryFuncsToInclude = options?.defaultLibraryFuncsToInclude ?? []
  const exportedRuntimeMethods = options?.exportedRuntimeMethods ?? []
  const processParseTools = options?.processParseTools ?? true

  let result = transform(fileName, sourceText, options)

  const conditionalLiteral = '"(?:\\\\.|[^"\\\\])*"'
  result = result
    .replace(new RegExp(`^[\\t ]*__emnapi_conditional_if__\\((${conditionalLiteral})\\);[\\t ]*$`, 'gm'), (_match, literal: string) => `#if ${JSON.parse(literal)}`)
    .replace(new RegExp(`^[\\t ]*__emnapi_conditional_elif__\\((${conditionalLiteral})\\);[\\t ]*$`, 'gm'), (_match, literal: string) => `#elif ${JSON.parse(literal)}`)
    .replace(/^[\t ]*__emnapi_conditional_else__\(\);[\t ]*$/gm, '#else')
    .replace(/^[\t ]*__emnapi_conditional_endif__\(\);[\t ]*$/gm, '#endif')

  const prefix = [
    ...defaultLibraryFuncsToInclude
      .map(sym => `{{{ ((typeof DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.add === "function" ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.add("${sym}") : (DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("${sym}") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("${sym}") : undefined)), "") }}}`),
    ...exportedRuntimeMethods
      .map(sym => `{{{ ((typeof EXPORTED_RUNTIME_METHODS.add === "function" ? EXPORTED_RUNTIME_METHODS.add("${sym}") : (EXPORTED_RUNTIME_METHODS.indexOf("${sym}") === -1 ? EXPORTED_RUNTIME_METHODS.push("${sym}") : undefined)), "") }}}`)
  ].join(EOL)

  if (processParseTools) {
    result = result
      .replace(/\/\* \{\{\{ \*\//g, '{{{ ')
      .replace(/\/\* \}\}\} \*\//g, ' }}}')
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
    processParseTools: options?.processParseTools ?? true
  }
}

export { createTransformerFactory, transform, transformWithOptions, getDefaultBaseOptions, getDefaultOptions }
