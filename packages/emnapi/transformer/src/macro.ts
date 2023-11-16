import type {
  TransformerFactory,
  SourceFile,
  Visitor,
  CallExpression,
  TransformationContext,
  Node,
  VisitResult,
  Identifier,
  Program,
  TypeChecker,
  FunctionDeclaration,
  ArrowFunction,
  FunctionExpression,
  JSDocTagInfo,
  ExpressionStatement,
  ReturnStatement,
  Modifier,
  ConciseBody,
  Block,
  Expression,
  Declaration
} from 'typescript'

import * as ts from 'typescript'
import { cloneNode } from 'ts-clone-node'

/* function preserveMultiLine (node: Node, sourceNode: Node): Node {
  if ((sourceNode as any)?.multiLine) {
    (node as any).multiLine = (sourceNode as any).multiLine
  }

  const children: Node[] = []
  node?.forEachChild(child => { children.push(child) })

  const sourceChildren: Node[] = []
  sourceNode?.forEachChild(child => { sourceChildren.push(child) })

  for (let i = 0; i < children.length; i++) {
    preserveMultiLine(children[i], sourceChildren[i])
  }
  return node
} */

const enum JSDocTagType {
  INLINE = 'inline',
  MACRO = 'macro'
}

export interface TransformOptions {
  test?: string | RegExp | ((name: string) => boolean)
}

class Transform {
  ctx: TransformationContext
  typeChecker: TypeChecker
  test?: string | RegExp | ((name: string) => boolean)

  constructor (context: TransformationContext, typeChecker: TypeChecker, options?: TransformOptions) {
    this.ctx = context
    this.typeChecker = typeChecker
    this.test = options?.test // ?? /^\$[_a-zA-Z0-9]+/
    this.visitor = this.visitor.bind(this)
    this.removeImportExport = this.removeImportExport.bind(this)
    this.removeVisitor = this.removeVisitor.bind(this)
    this.constEnumVisitor = this.constEnumVisitor.bind(this)
  }

  testMacroName (text: string): boolean {
    return typeof this.test === 'function'
      ? this.test(text)
      : typeof this.test === 'string'
        ? (new RegExp(this.test).test(text))
        : this.test!.test(text)
  }

  isMacro (n: Node): boolean {
    if (ts.isFunctionDeclaration(n)) {
      return Boolean((n.body && n.name && this.testMacroName(n.name.text)))
    }
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
      return Boolean(n.body && ts.isVariableDeclaration(n.parent) && n.parent.name && ts.isIdentifier(n.parent.name) && this.testMacroName(n.parent.name.text))
    }
    return false
  }

  constEnumVisitor (node: Node): Node {
    const factory = this.ctx.factory
    const checker = this.typeChecker
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const enumValue = checker.getConstantValue(node)
      if (typeof enumValue === 'number') {
        return ts.addSyntheticTrailingComment(
          factory.createNumericLiteral(enumValue),
          ts.SyntaxKind.MultiLineCommentTrivia,
          ` ${node.expression.text as string}.${node.name.text as string} `,
          false
        )
      } else if (typeof enumValue === 'string') {
        return ts.addSyntheticTrailingComment(
          factory.createStringLiteral(enumValue),
          ts.SyntaxKind.MultiLineCommentTrivia,
          ` ${node.expression.text as string}.${node.name.text as string} `,
          false
        )
      }
    }

    return ts.visitEachChild(node, this.constEnumVisitor, this.ctx)
  }

  expandMacro (node: CallExpression, valueDeclaration: FunctionDeclaration | ArrowFunction | FunctionExpression, type: JSDocTagType, originalNode: ExpressionStatement | ReturnStatement | CallExpression): VisitResult<Node> {
    const factory = this.ctx.factory
    const checker = this.typeChecker
    const cloneOptions: any = {
      typescript: ts,
      factory,
      /* finalize: (clonedNode: Node, oldNode: Node) => {
        if (ts.isStringLiteral(oldNode)) {
          (clonedNode as any).singleQuote = true
        }
        return preserveMultiLine(clonedNode, oldNode)
      }, */
      setOriginalNodes: true,
      setParents: true,
      preserveComments: true,
      preserveSymbols: true
    }

    const decl = cloneNode(valueDeclaration, cloneOptions)
    const args = node.arguments.map(a =>
      ts.visitNode(
        ts.visitNode(a, this.visitor),
        this.constEnumVisitor
      ) as ts.Expression
    )
    const paramNames = valueDeclaration.parameters.map(p => p.name.getText())
    const macroBodyVisitor: Visitor = (nodeInMacro) => {
      const newNode = nodeInMacro
      let result: VisitResult<Node> = newNode

      if ((ts.isExpressionStatement(newNode) && ts.isCallExpression(newNode.expression)) || (ts.isReturnStatement(newNode) && newNode.expression && ts.isCallExpression(newNode.expression))) {
        const callExpressionExpression = (newNode.expression as CallExpression).expression
        if (ts.isIdentifier(callExpressionExpression)) {
          const callArgs = (newNode.expression as CallExpression).arguments
          const sym = checker.getSymbolAtLocation(callExpressionExpression)?.valueDeclaration
          if (sym && paramNames.includes(callExpressionExpression.text)) {
            const index = paramNames.indexOf(callExpressionExpression.text)
            const arg = args[index]
            if ((ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) && ts.isBlock(arg.body)) {
              const names = arg.parameters.map(p => String((p.name as Identifier).text))
              const replaceIdentifierVisitor = (n: Node): Node => {
                if (ts.isIdentifier(n)) {
                  const sym = checker.getSymbolAtLocation(n)?.valueDeclaration
                  if (sym && names.includes(n.text)) {
                    const index = names.indexOf(n.text)
                    return cloneNode(callArgs[index], cloneOptions)
                  }
                }

                return ts.visitEachChild(n, replaceIdentifierVisitor, this.ctx)
              }
              const b = ts.visitEachChild(arg.body, replaceIdentifierVisitor, this.ctx)
              result = b.statements
            }
          }
        }
      } else if (ts.isIdentifier(newNode)/*  && !ts.isParameter(newNode.parent) */) {
        const sym = checker.getSymbolAtLocation(newNode)?.valueDeclaration
        if (sym && paramNames.includes(newNode.text)) {
          const index = paramNames.indexOf(newNode.text)
          result = cloneNode(args[index], cloneOptions)
        }
      }

      if (Array.isArray(result)) {
        return result.map(n => ts.visitEachChild(n, macroBodyVisitor, this.ctx))
      }

      return ts.visitEachChild(result as Node, macroBodyVisitor, this.ctx)
    }

    if (type === JSDocTagType.INLINE) {
      const body = decl.body!
      const transformedBody = ts.visitNode(ts.visitNode(body, this.visitor), this.constEnumVisitor)
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
      throw new Error('unreachable')
    }
  }

  getDeclarationIfMacroCall (node: CallExpression): { valueDeclaration: Declaration | undefined; type: JSDocTagType } {
    if (!this.test) {
      let t = JSDocTagType.MACRO
      if (((ts.isNonNullExpression(node.expression) && ts.isIdentifier(node.expression.expression)) || ts.isIdentifier(node.expression))) {
        const identifier = ts.isNonNullExpression(node.expression) ? node.expression.expression : node.expression as Identifier
        const type = this.typeChecker.getTypeAtLocation(identifier)
        const sym = type.getSymbol()
        const someFn = (info: JSDocTagInfo): boolean => {
          if (info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO) {
            t = info.name
            return true
          }
          return false
        }
        if (sym?.getJsDocTags(this.typeChecker).reverse().some(someFn)) {
          return { valueDeclaration: sym.valueDeclaration, type: t }
        }
      }
      return { valueDeclaration: undefined, type: t }
    } else {
      if (ts.isNonNullExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        this.testMacroName(node.expression.expression.text)
      ) {
        const type = this.typeChecker.getTypeAtLocation(node.expression.expression)
        const sym = type.getSymbol()
        if (sym) {
          return { valueDeclaration: sym.valueDeclaration, type: JSDocTagType.MACRO }
        }
      }
      return { valueDeclaration: undefined, type: JSDocTagType.MACRO }
    }
  }

  visitor (n: Node): VisitResult<Node> {
    // const factory = this.ctx.factory
    // const checker = this.typeChecker

    if (((ts.isFunctionDeclaration(n) && n.name) || ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)))) {
      const type = this.typeChecker.getTypeAtLocation(ts.isFunctionDeclaration(n) ? n.name! : ((n.parent as ts.VariableDeclaration).name as Identifier))
      const sym = type.getSymbol()
      const someFn = (info: JSDocTagInfo): boolean => {
        if (info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO) {
          return true
        }
        return false
      }
      if (sym?.getJsDocTags(this.typeChecker).reverse().some(someFn)) {
        return n
      }
    }

    if ((ts.isExpressionStatement(n) || ts.isReturnStatement(n)) && n.expression && ts.isCallExpression(n.expression)) {
      const { valueDeclaration, type } = this.getDeclarationIfMacroCall(n.expression)
      if (valueDeclaration && (ts.isFunctionDeclaration(valueDeclaration) || ts.isArrowFunction(valueDeclaration) || ts.isFunctionExpression(valueDeclaration)) && valueDeclaration.body) {
        return this.expandMacro(n.expression, valueDeclaration, type, n)
      }
    }

    if (ts.isCallExpression(n)) {
      const { valueDeclaration, type } = this.getDeclarationIfMacroCall(n)
      if (valueDeclaration && (
        (ts.isArrowFunction(valueDeclaration) && ts.isExpression(valueDeclaration.body)) ||
        ((ts.isFunctionDeclaration(valueDeclaration) || ts.isArrowFunction(valueDeclaration) || ts.isFunctionExpression(valueDeclaration)) && valueDeclaration.body && type === JSDocTagType.INLINE)
      )) {
        return this.expandMacro(n, valueDeclaration, type, n)
      }
    }

    return ts.visitEachChild(n, this.visitor, this.ctx)
  }

  isMacroIdentifier (n: Node): boolean {
    if (!n) return false
    if (ts.isIdentifier(n)) {
      const symbol = this.typeChecker.getTypeAtLocation(n)?.getSymbol()
      const decls = symbol?.getDeclarations()
      if (decls) {
        const n = decls[0]
        if (!this.test) {
          if (ts.isFunctionDeclaration(n)) {
            return Boolean(n.name && this.typeChecker.getSymbolAtLocation(n.name)?.getJsDocTags().some(info => info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO))
          }
          if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
            return Boolean(ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name) && this.typeChecker.getSymbolAtLocation(n.parent.name)?.getJsDocTags().some(info => info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO))
          }
        } else {
          if (ts.isFunctionDeclaration(n)) {
            return Boolean((n.body && n.name && this.testMacroName(n.name.text)))
          }
          if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
            return Boolean(n.body && ts.isVariableDeclaration(n.parent) && n.parent.name && ts.isIdentifier(n.parent.name) && this.testMacroName(n.parent.name.text))
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
          this.ctx.factory.updateNamedExports(n.exportClause, newElements), n.moduleSpecifier, n.assertClause)
      }
    } else if (ts.isImportDeclaration(n)) {
      if (n.importClause) {
        let newName = n.importClause.name
        let newBindings = n.importClause.namedBindings
        if (n.importClause.name) {
          if (this.isMacroIdentifier(n.importClause.name)) {
            newName = undefined
          }
        }
        if (n.importClause.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
          const newElements = n.importClause.namedBindings.elements.filter(sp => {
            return !this.isMacroIdentifier(sp.name)
          })
          newBindings = newElements.length > 0
            ? this.ctx.factory.updateNamedImports(n.importClause.namedBindings, newElements)
            : undefined
        }
        return this.ctx.factory.updateImportDeclaration(n, n.modifiers,
          newBindings || newName
            ? this.ctx.factory.updateImportClause(n.importClause, n.importClause.isTypeOnly, newName, newBindings)
            : undefined,
          n.moduleSpecifier, n.assertClause
        )
      }
    }

    return ts.visitEachChild(n, this.removeImportExport, this.ctx)
  }

  removeVisitor (n: Node): VisitResult<Node | undefined> {
    const checker = this.typeChecker
    if (!this.test) {
      if (ts.isFunctionDeclaration(n) && n.name && checker.getSymbolAtLocation(n.name)?.getJsDocTags().some(info => info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO)) {
        return undefined
      }
      if (ts.isVariableStatement(n)) {
        const newDeclarations = n.declarationList.declarations.filter(
          (d) => !(ts.isIdentifier(d.name) && checker.getSymbolAtLocation(d.name)?.getJsDocTags().some(info => info.name === JSDocTagType.INLINE || info.name === JSDocTagType.MACRO))
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

function createTransformerFactory (program: Program, config: TransformOptions): TransformerFactory<SourceFile> {
  const typeChecker = program.getTypeChecker()
  return (context) => {
    const transform = new Transform(context, typeChecker, config)

    return (src) => {
      if (src.isDeclarationFile) return src

      return ts.visitEachChild(
        ts.visitEachChild(
          ts.visitEachChild(src, transform.visitor, context),
          transform.removeImportExport,
          context
        ),
        transform.removeVisitor,
        context
      )
    }
  }
}

export default createTransformerFactory
