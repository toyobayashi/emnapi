import type {
  SourceFile,
  CallExpression,
  Node,
  Identifier,
  FunctionDeclaration,
  ArrowFunction,
  FunctionExpression,
  ExpressionStatement,
  ReturnStatement,
  VariableDeclaration,
  Modifier,
  ConciseBody,
  Block,
  VariableStatement,
  Expression,
  Declaration
} from 'typescript/ast'

import type { Program, Checker as TypeChecker, JSDocTagInfo } from 'typescript/sync'
import { SymbolFlags } from 'typescript/sync'
import * as tsAst from 'typescript/ast'
import {
  addSyntheticTrailingComment,
  createTsCompat,
  getConstantValue,
  getOriginalNode,
  getSymbolAtLocation,
  getTypeAtLocation,
  preserveNodeMetadata,
  resolveDeclaration,
  setOriginalNode,
  visitNodeArray,
  type VisitResult,
  type Visitor,
  type TransformationContext,
  type TransformerFactory
} from '@emnapi/shared/transformer-compat'

function retainOriginalNode (updated: any, original: Node): any {
  const sourceNode = getOriginalNode(original)
  if (Array.isArray(updated)) {
    return updated.map((node, index) => retainOriginalNode(node, index === 0 ? sourceNode : original))
  }
  preserveNodeMetadata(updated, original)
  if (updated && updated !== original) {
    if (!(updated as any).__ts7OriginalNode) setOriginalNode(updated, sourceNode)
  }
  return updated
}

const ts = createTsCompat({
  SymbolFlags,
  addSyntheticTrailingComment,
  visitEachChild<T extends Node> (node: T, visitor: Visitor): T {
    const visitStatements = (statements: any) => visitNodeArray(
      statements,
      (statement: Node) => visitor(statement),
      ts.factory,
      (updated: any, original: Node, index = 0) => retainOriginalNode(updated, index === 0 ? original : updated)
    )
    if (ts.isSourceFile(node)) {
      return retainOriginalNode(ts.factory.updateSourceFile(node, visitStatements(node.statements) as any, node.endOfFileToken), node) as T
    }
    if (ts.isBlock(node) || ts.isModuleBlock(node)) {
      const updated = ts.isBlock(node)
        ? ts.factory.updateBlock(node, visitStatements(node.statements) as any) as unknown as T
        : ts.factory.updateModuleBlock(node, visitStatements(node.statements) as any) as unknown as T
      return retainOriginalNode(updated, node) as T
    }
    if (ts.isCaseClause(node)) {
      return retainOriginalNode(ts.factory.updateCaseClause(node, node.expression, visitStatements(node.statements) as any), node) as T
    }
    if (ts.isDefaultClause(node)) {
      return retainOriginalNode(ts.factory.updateDefaultClause(node, node.expression, visitStatements(node.statements) as any), node) as T
    }
    const visitChild: tsAst.Visitor = child => retainOriginalNode(visitor(child), child)
    return retainOriginalNode(tsAst.visitEachChild(node, visitChild), node) as T
  }
}, retainOriginalNode)

function cloneNode<T extends Node> (node: T): T {
  const clone = ts.getSynthesizedDeepClone(node)
  const attachOriginalNodes = (original: Node, copied: Node): void => {
    Object.defineProperty(copied, '__ts7OriginalNode', { value: getOriginalNode(original), configurable: true })
    preserveLeadingStatementComments(original, copied)
    const originalChildren: Node[] = []
    const copiedChildren: Node[] = []
    original.forEachChild(child => { originalChildren.push(child) })
    copied.forEachChild(child => { copiedChildren.push(child) })
    for (let i = 0; i < Math.min(originalChildren.length, copiedChildren.length); i++) {
      attachOriginalNodes(originalChildren[i], copiedChildren[i])
    }
  }
  attachOriginalNodes(node, clone)
  return clone
}

function preserveLeadingStatementComments (original: Node, copied: Node): void {
  if (!ts.isStatement(original)) return
  let trivia: string
  try {
    const sourceNode = getOriginalNode(original)
    trivia = sourceNode.getFullText().slice(0, sourceNode.getLeadingTriviaWidth())
  } catch {
    return
  }
  const comments = trivia.match(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g) ?? []
  if (comments.length === 0) return
  const annotations = comments.map(comment => ({
    kind: comment.startsWith('//') ? ts.SyntaxKind.SingleLineCommentTrivia : ts.SyntaxKind.MultiLineCommentTrivia,
    text: comment.startsWith('//') ? comment.slice(2) : comment.slice(2, -2),
    leading: true,
    hasTrailingNewLine: comment.startsWith('//')
  }))
  const existing = (copied as any).__ts7SyntheticComments ?? []
  const additions = annotations.filter(comment => !existing.some((item: any) => (
    item.kind === comment.kind && item.text === comment.text && item.leading
  )))
  if (additions.length > 0) {
    Object.defineProperty(copied, '__ts7SyntheticComments', {
      value: [...existing, ...additions],
      configurable: true
    })
  }
}

const enum JSDocTagType {
  INLINE = 'inline',
  MACRO = 'macro'
}

export interface TransformOptions {
  test?: string | RegExp | ((name: string) => boolean)
}

interface MacroCallInfo {
  valueDeclaration: Declaration | undefined
  type: JSDocTagType
}

class Transform {
  ctx: TransformationContext
  program: Program
  typeChecker: TypeChecker
  test?: string | RegExp | ((name: string) => boolean)
  private readonly testRegex?: RegExp
  private readonly macroCallInfo = new WeakMap<CallExpression, MacroCallInfo>()
  private readonly macroDocBySymbolId = new Map<number, boolean>()

  constructor (program: Program, context: TransformationContext, typeChecker: TypeChecker, options?: TransformOptions) {
    this.program = program
    this.ctx = context
    this.typeChecker = typeChecker
    this.test = options?.test // ?? /^\$[_a-zA-Z0-9]+/
    this.testRegex = typeof this.test === 'string' ? new RegExp(this.test) : undefined
    this.visitor = this.visitor.bind(this)
    this.removeImportExport = this.removeImportExport.bind(this)
    this.removeVisitor = this.removeVisitor.bind(this)
    this.constEnumVisitor = this.constEnumVisitor.bind(this)
  }

  testMacroName (text: string): boolean {
    return typeof this.test === 'function'
      ? this.test(text)
      : typeof this.test === 'string'
        ? (this.testRegex!.lastIndex = 0, this.testRegex!.test(text))
        : this.test!.test(text)
  }

  hasMacroDoc (node: Node): boolean {
    const symbol = getSymbolAtLocation(this.typeChecker, node)
    if (!symbol) return false
    const cached = this.macroDocBySymbolId.get(symbol.id)
    if (cached !== undefined) return cached
    const isMacro = symbol.getJsDocTags(this.typeChecker).some(info => info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO)
    this.macroDocBySymbolId.set(symbol.id, isMacro)
    return isMacro
  }

  isMacro (n: Node): boolean {
    if (ts.isFunctionDeclaration(n)) {
      return Boolean((n.body && n.name && this.testMacroName(n.name.text)))
    }
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
      return Boolean(n.body && n.parent && ts.isVariableDeclaration(n.parent) && n.parent.name && ts.isIdentifier(n.parent.name) && this.testMacroName(n.parent.name.text))
    }
    return false
  }

  constEnumVisitor (node: Node): Node {
    const factory = this.ctx.factory
    const checker = this.typeChecker
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const enumValue = getConstantValue(checker, node)
      if (typeof enumValue === 'number') {
        return addSyntheticTrailingComment(
          enumValue < 0
            ? factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, factory.createNumericLiteral(-enumValue))
            : factory.createNumericLiteral(enumValue),
          ts.SyntaxKind.MultiLineCommentTrivia,
          ` ${node.expression.text as string}.${node.name.text as string} `,
          false
        )
      } else if (typeof enumValue === 'string') {
        return addSyntheticTrailingComment(
          factory.createStringLiteral(enumValue),
          ts.SyntaxKind.MultiLineCommentTrivia,
          ` ${node.expression.text as string}.${node.name.text as string} `,
          false
        )
      }
    }

    return ts.visitEachChild(node, this.constEnumVisitor, this.ctx)
  }

  expandMacro (node: CallExpression, valueDeclaration: FunctionDeclaration | ArrowFunction | FunctionExpression, type: JSDocTagType, originalNode: ExpressionStatement | ReturnStatement | CallExpression | VariableStatement): VisitResult<Node> {
    const factory = this.ctx.factory
    const checker = this.typeChecker
    const decl = cloneNode(valueDeclaration)
    const args = node.arguments.map(a => ts.visitNode(a, this.visitor) as Expression)
    const paramNames = valueDeclaration.parameters.map(p => p.name.getText())
    const paramIndices = new Map<string, number>()
    for (let i = 0; i < paramNames.length; i++) {
      if (!paramIndices.has(paramNames[i])) paramIndices.set(paramNames[i], i)
    }
    const macroBodyVisitor: Visitor = (nodeInMacro) => {
      const newNode = nodeInMacro
      let result: VisitResult<Node> = newNode

      if ((ts.isExpressionStatement(newNode) && ts.isCallExpression(newNode.expression)) || (ts.isReturnStatement(newNode) && newNode.expression && ts.isCallExpression(newNode.expression))) {
        const callExpressionExpression = (newNode.expression as CallExpression).expression
        if (ts.isIdentifier(callExpressionExpression)) {
          const index = paramIndices.get(callExpressionExpression.text)
          const sym = index === undefined
            ? undefined
            : resolveDeclaration(getSymbolAtLocation(checker, callExpressionExpression)?.valueDeclaration, this.program)
          if (sym && index !== undefined) {
            const callArgs = (newNode.expression as CallExpression).arguments
            const arg = args[index]
            if ((ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) && ts.isBlock(arg.body)) {
              const names = arg.parameters.map(p => String((p.name as Identifier).text))
              const callbackParamIndices = new Map<string, number>()
              for (let i = 0; i < names.length; i++) {
                if (!callbackParamIndices.has(names[i])) callbackParamIndices.set(names[i], i)
              }
              const replaceIdentifierVisitor = (n: Node): Node => {
                if (ts.isIdentifier(n)) {
                  const index = callbackParamIndices.get(n.text)
                  const sym = index === undefined
                    ? undefined
                    : resolveDeclaration(getSymbolAtLocation(checker, n)?.valueDeclaration, this.program)
                  if (sym && index !== undefined) {
                    return cloneNode(callArgs[index])
                  }
                }

                return ts.visitEachChild(n, replaceIdentifierVisitor, this.ctx)
              }
              const b = ts.visitEachChild(arg.body, replaceIdentifierVisitor, this.ctx)
              result = b.statements
            }
          }
        }
      } else if (ts.isIdentifier(newNode)) {
        const index = paramIndices.get(newNode.text)
        const sym = index === undefined
          ? undefined
          : resolveDeclaration(getSymbolAtLocation(checker, newNode)?.valueDeclaration, this.program)
        if (sym && index !== undefined) {
          result = cloneNode(args[index])
        }
      }

      if (Array.isArray(result)) {
        return result.map(n => ts.visitEachChild(n, macroBodyVisitor, this.ctx))
      }

      return ts.visitEachChild(result as Node, macroBodyVisitor, this.ctx)
    }

    if (type === JSDocTagType.INLINE) {
      const body = decl.body!
      const firstVisit = ts.visitNode(body, this.visitor) ?? body
      const transformedBody = ts.visitNode(firstVisit, this.constEnumVisitor) ?? firstVisit
      const f = ts.isArrowFunction(decl)
        ? factory.updateArrowFunction(decl, decl.modifiers, decl.typeParameters, decl.parameters, decl.type, decl.equalsGreaterThanToken, transformedBody as ConciseBody)
        : factory.createFunctionExpression(decl.modifiers?.filter(d => d.kind !== ts.SyntaxKind.Decorator && d.kind !== ts.SyntaxKind.ExportKeyword) as (readonly Modifier[] | undefined), decl.asteriskToken, undefined, decl.typeParameters, decl.parameters, decl.type, transformedBody as Block)
      if (ts.isCallExpression(originalNode)) {
        return factory.updateCallExpression(originalNode, factory.createParenthesizedExpression(f), originalNode.typeArguments, args)
      }
      if (ts.isExpressionStatement(originalNode)) {
        const callExpression = originalNode.expression as CallExpression
        return factory.updateExpressionStatement(originalNode,
          factory.updateCallExpression(callExpression, factory.createParenthesizedExpression(f), callExpression.typeArguments, args))
      }
      if (ts.isReturnStatement(originalNode)) {
        const callExpression = originalNode.expression as CallExpression
        return factory.updateReturnStatement(originalNode,
          factory.updateCallExpression(callExpression, factory.createParenthesizedExpression(f), callExpression.typeArguments, args))
      }
      throw new Error('unreachable')
    } else {
      const body = decl.body!
      if (ts.isBlock(body!)) {
        const transformedBody = ts.visitEachChild(
          ts.visitEachChild(
            ts.visitEachChild(
              body!,
              macroBodyVisitor,
              this.ctx
            ),
            this.visitor,
            this.ctx
          ),
          this.constEnumVisitor,
          this.ctx
        )
        return transformedBody.statements
      }
      const transformedBody = ts.visitNode(body, macroBodyVisitor) as Expression
      if (ts.isCallExpression(originalNode)) {
        return transformedBody
      }
      if (ts.isExpressionStatement(originalNode)) {
        return factory.updateExpressionStatement(originalNode, transformedBody)
      }
      if (ts.isReturnStatement(originalNode)) {
        return factory.updateReturnStatement(originalNode, transformedBody)
      }
      if (ts.isVariableStatement(originalNode)) {
        return factory.updateVariableStatement(originalNode, originalNode.modifiers,
          factory.updateVariableDeclarationList(originalNode.declarationList, [
            factory.updateVariableDeclaration(originalNode.declarationList.declarations[0],
              originalNode.declarationList.declarations[0].name,
              originalNode.declarationList.declarations[0].exclamationToken,
              originalNode.declarationList.declarations[0].type,
              transformedBody
            )
          ]))
      }
      throw new Error('unreachable')
    }
  }

  getDeclarationIfMacroCall (node: CallExpression): { valueDeclaration: Declaration | undefined; type: JSDocTagType } {
    const cached = this.macroCallInfo.get(node)
    if (cached) return cached
    let result: MacroCallInfo
    if (!this.test) {
      let t = JSDocTagType.MACRO
      if (((ts.isNonNullExpression(node.expression) && ts.isIdentifier(node.expression.expression)) || ts.isIdentifier(node.expression))) {
        const identifier = ts.isNonNullExpression(node.expression) ? node.expression.expression : node.expression as Identifier
        const type = getTypeAtLocation(this.typeChecker, identifier)
        const sym = type.getSymbol()
        const someFn = (info: JSDocTagInfo): boolean => {
          if (info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO) {
            t = info.name
            return true
          }
          return false
        }
        if (sym?.getJsDocTags(this.typeChecker).slice().reverse().some(someFn)) {
          result = { valueDeclaration: resolveDeclaration(sym.valueDeclaration, this.program), type: t }
        } else {
          result = { valueDeclaration: undefined, type: t }
        }
      } else {
        result = { valueDeclaration: undefined, type: t }
      }
    } else {
      if (ts.isNonNullExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        this.testMacroName(node.expression.expression.text)
      ) {
        const type = getTypeAtLocation(this.typeChecker, node.expression.expression)
        const sym = type.getSymbol()
        if (sym) {
          result = { valueDeclaration: resolveDeclaration(sym.valueDeclaration, this.program), type: JSDocTagType.MACRO }
        } else {
          result = { valueDeclaration: undefined, type: JSDocTagType.MACRO }
        }
      } else {
        result = { valueDeclaration: undefined, type: JSDocTagType.MACRO }
      }
    }
    this.macroCallInfo.set(node, result)
    return result
  }

  visitor (n: Node): VisitResult<Node> {
    // const factory = this.ctx.factory
    // const checker = this.typeChecker

    if (((ts.isFunctionDeclaration(n) && n.name) || ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)))) {
      const type = getTypeAtLocation(this.typeChecker, ts.isFunctionDeclaration(n) ? n.name! : ((n.parent as VariableDeclaration).name as Identifier))
      const sym = type.getSymbol()
      const someFn = (info: JSDocTagInfo): boolean => {
        if (info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO) {
          return true
        }
        return false
      }
      if (sym?.getJsDocTags(this.typeChecker).slice().reverse().some(someFn)) {
        return n
      }
    }

    if ((ts.isExpressionStatement(n) || ts.isReturnStatement(n)) && n.expression && ts.isCallExpression(n.expression)) {
      const { valueDeclaration, type } = this.getDeclarationIfMacroCall(n.expression)
      if (valueDeclaration && (ts.isFunctionDeclaration(valueDeclaration) || ts.isArrowFunction(valueDeclaration) || ts.isFunctionExpression(valueDeclaration)) && valueDeclaration.body) {
        return prepareMacroExpansion(this.expandMacro(n.expression, valueDeclaration, type, n))
      }
    }

    if (ts.isVariableStatement(n) && n.declarationList.declarations.length === 1 && n.declarationList.declarations[0].initializer) {
      const expression = n.declarationList.declarations[0].initializer
      if (ts.isCallExpression(expression) || (ts.isAsExpression(expression) && ts.isCallExpression(expression.expression))) {
        const call = ts.isCallExpression(expression) ? expression : expression.expression as CallExpression
        const { valueDeclaration, type } = this.getDeclarationIfMacroCall(call)
        if (valueDeclaration && (ts.isFunctionDeclaration(valueDeclaration) || ts.isArrowFunction(valueDeclaration) || ts.isFunctionExpression(valueDeclaration)) && valueDeclaration.body && type === JSDocTagType.MACRO) {
          return prepareMacroExpansion(this.expandMacro(call, valueDeclaration, type, n))
        }
      }
    }

    if (ts.isCallExpression(n)) {
      const { valueDeclaration, type } = this.getDeclarationIfMacroCall(n)
      if (valueDeclaration && (
        (ts.isArrowFunction(valueDeclaration) && ts.isExpression(valueDeclaration.body)) ||
        ((ts.isFunctionDeclaration(valueDeclaration) || ts.isArrowFunction(valueDeclaration) || ts.isFunctionExpression(valueDeclaration)) && valueDeclaration.body && type === JSDocTagType.INLINE)
      )) {
        return prepareMacroExpansion(this.expandMacro(n, valueDeclaration, type, n))
      }
    }

    return ts.visitEachChild(n, this.visitor, this.ctx)
  }

  isMacroIdentifier (n: Node): boolean {
    if (!n) return false
    if (ts.isIdentifier(n)) {
      const symbol = getTypeAtLocation(this.typeChecker, n)?.getSymbol()
      const decls = symbol?.declarations.map(d => d.resolve(this.program.getProject())).filter(Boolean) as Node[] | undefined
      if (decls) {
        const n = decls[0]
        if (!this.test) {
          if (ts.isFunctionDeclaration(n)) {
            return Boolean(n.name && this.hasMacroDoc(n.name))
          }
          if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
            return Boolean(n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name) && this.hasMacroDoc(n.parent.name))
          }
        } else {
          if (ts.isFunctionDeclaration(n)) {
            return Boolean((n.body && n.name && this.testMacroName(n.name.text)))
          }
          if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
            return Boolean(n.body && n.parent && ts.isVariableDeclaration(n.parent) && n.parent.name && ts.isIdentifier(n.parent.name) && this.testMacroName(n.parent.name.text))
          }
          return false
        }
      }
      return false
    }
    return false
  }

  removeImportExport: Visitor = (n) => {
    if (ts.isExportAssignment(n)) {
      if (this.isMacroIdentifier(n.expression)) {
        return undefined
      }
    } else if (ts.isExportDeclaration(n)) {
      if (n.exportClause && ts.isNamedExports(n.exportClause)) {
        const newElements = n.exportClause.elements.filter(sp => {
          return !this.isMacroIdentifier(sp.name)
        })
        return this.ctx.factory.updateExportDeclaration(n, n.modifiers, n.isTypeOnly,
          this.ctx.factory.updateNamedExports(n.exportClause, newElements), n.moduleSpecifier, n.attributes)
      }
    } else if (ts.isImportDeclaration(n)) {
      const isTypeOnly = Boolean((n.importClause as any)?.isTypeOnly)
      if (n.importClause && !isTypeOnly) {
        let newName = n.importClause.name
        let newBindings = n.importClause.namedBindings
        if (n.importClause.name) {
          if (this.isMacroIdentifier(n.importClause.name)) {
            newName = undefined
          }
        }
        if (n.importClause.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
          const newElements = n.importClause.namedBindings.elements.filter(sp => {
              return !this.isMacroIdentifier(sp.name) && !sp.isTypeOnly && getTypeAtLocation(this.typeChecker, sp.name).getSymbol()?.flags !== ts.SymbolFlags.ConstEnum
          })
          newBindings = newElements.length > 0
            ? this.ctx.factory.updateNamedImports(n.importClause.namedBindings, newElements)
            : undefined
        }
        return this.ctx.factory.updateImportDeclaration(n, n.modifiers,
          newBindings || newName
          ? this.ctx.factory.updateImportClause(n.importClause, isTypeOnly, newName, newBindings)
            : undefined,
          n.moduleSpecifier, n.attributes
        )
      }
    }

    return ts.visitEachChild(n, this.removeImportExport, this.ctx)
  }

  removeVisitor (n: Node): VisitResult<Node | undefined> {
    if (!this.test) {
      if (ts.isFunctionDeclaration(n) && n.name && this.hasMacroDoc(n.name)) {
        return undefined
      }
      if (ts.isVariableStatement(n)) {
        const newDeclarations = n.declarationList.declarations.filter(
          (d) => !(ts.isIdentifier(d.name) && this.hasMacroDoc(d.name))
        )
        if (newDeclarations.length > 0) {
          return this.ctx.factory.updateVariableStatement(n, n.modifiers, this.ctx.factory.updateVariableDeclarationList(n.declarationList, newDeclarations))
        } else {
          return undefined
        }
      }
    } else {
      if (ts.isFunctionDeclaration(n) && n.name && this.testMacroName(n.name.text) && n.body) {
        return undefined
      }
      if (ts.isVariableStatement(n)) {
        const newDeclarations = n.declarationList.declarations.filter(
          (d) => !(ts.isIdentifier(d.name) && this.testMacroName(d.name.text) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) && d.initializer.body)
        )
        if (newDeclarations.length > 0) {
          return this.ctx.factory.updateVariableStatement(n, n.modifiers, this.ctx.factory.updateVariableDeclarationList(n.declarationList, newDeclarations))
        } else {
          return undefined
        }
      }
    }

    return ts.visitEachChild(n, this.removeVisitor, this.ctx)
  }
}

function createTransformerFactory (program: Program, config: TransformOptions): TransformerFactory {
  const typeChecker = program.getProject().checker
  return (context) => {
    const transform = new Transform(program, context, typeChecker, config)

    return (src) => {
      if (src.isDeclarationFile) return src

      const transformed = ts.visitEachChild(
        ts.visitEachChild(
          ts.visitEachChild(src, transform.visitor, context),
          transform.removeImportExport,
          context
        ),
        transform.removeVisitor,
        context
      )
      resetForeignSourceRanges(transformed, src.fileName)
      return transformed
    }
  }
}

function resetForeignSourceRanges (sourceFile: SourceFile, destinationFileName: string): void {
  const resetRange = (node: any): void => {
    Object.defineProperty(node, 'pos', { value: -1, writable: true, configurable: true })
    Object.defineProperty(node, 'end', { value: -1, writable: true, configurable: true })
  }

  const visit = (node: Node, inheritedForeign: boolean): void => {
    const original = (node as any).__ts7OriginalNode as Node | undefined
    let foreign = inheritedForeign
    if (original) {
      try {
        foreign = original.getSourceFile().fileName !== destinationFileName
      } catch {}
    }
    if (foreign) resetRange(node)
    node.forEachChild(child => visit(child, foreign), nodes => {
      if (foreign) resetRange(nodes)
      for (const child of nodes) visit(child, foreign)
    })
  }
  visit(sourceFile, false)
}

function prepareMacroExpansion<T extends Node> (result: VisitResult<T>): VisitResult<T> {
  const resetRange = (node: any): void => {
    Object.defineProperty(node, 'pos', { value: -1, writable: true, configurable: true })
    Object.defineProperty(node, 'end', { value: -1, writable: true, configurable: true })
  }
  const visit = (node: Node): void => {
    preserveLeadingStatementComments(node, node)
    resetRange(node)
    node.forEachChild(child => visit(child), nodes => {
      resetRange(nodes)
      for (const child of nodes) visit(child)
    })
  }
  if (Array.isArray(result)) {
    for (const node of result) visit(node)
  } else if (result) {
    visit(result as Node)
  }
  return result
}

export { createTransformerFactory }
