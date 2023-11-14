import type {
  TransformerFactory,
  SourceFile,
  Visitor,
  CallExpression,
  TransformationContext,
  Node,
  VisitResult,
  NonNullExpression,
  Identifier,
  Program,
  TypeChecker
} from 'typescript'

import * as ts from 'typescript'
import { cloneNode } from 'ts-clone-node'

function isMacroCall (node: Node): node is CallExpression {
  return ts.isCallExpression(node) &&
    ts.isNonNullExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text.length > 1 &&
    node.expression.expression.text.charAt(0) === '$'
}

class Transform {
  ctx: TransformationContext
  typeChecker: TypeChecker

  constructor (context: TransformationContext, typeChecker: TypeChecker) {
    this.ctx = context
    this.typeChecker = typeChecker
    this.visitor = this.visitor.bind(this)
    this.constEnumVisitor = this.constEnumVisitor.bind(this)
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

  visitor (n: Node): VisitResult<Node> {
    const factory = this.ctx.factory
    const checker = this.typeChecker

    if ((ts.isExpressionStatement(n) && isMacroCall(n.expression)) || (ts.isReturnStatement(n) && n.expression && isMacroCall(n.expression))) {
      const node = n.expression
      // const macroName = ((node.expression as NonNullExpression).expression as Identifier).text

      const cloneOptions: any = {
        typescript: ts,
        factory,
        setOriginalNodes: true,
        setParents: true,
        preserveComments: true,
        preserveSymbols: true
      }

      const type = checker.getTypeAtLocation((node.expression as NonNullExpression).expression as Identifier)
      const valueDeclaration = type.getSymbol()?.valueDeclaration
      if (valueDeclaration && ts.isFunctionDeclaration(valueDeclaration) && valueDeclaration.body) {
        const decl = cloneNode(this.visitor(valueDeclaration) as ts.FunctionDeclaration, cloneOptions)
        const args = node.arguments.map(a => cloneNode(
          ts.visitEachChild(
            ts.visitEachChild(a, this.visitor, this.ctx),
            this.constEnumVisitor,
            this.ctx
          ),
          cloneOptions
        ))
        const paramNames = valueDeclaration.parameters.map(p => p.name.getText())
        const macroBodyVisitor: Visitor = (nodeInMacro) => {
          const newNode = this.constEnumVisitor(nodeInMacro)
          let result: VisitResult<Node> = newNode

          if ((ts.isExpressionStatement(newNode) && ts.isCallExpression(newNode.expression)) || (ts.isReturnStatement(newNode) && newNode.expression && ts.isCallExpression(newNode.expression))) {
            const callExpressionExpression = (newNode.expression as CallExpression).expression
            if (ts.isIdentifier(callExpressionExpression)) {
              const callArgs = (newNode.expression as CallExpression).arguments.map((a) => cloneNode(a, cloneOptions))
              const sym = checker.getSymbolAtLocation(callExpressionExpression)?.valueDeclaration
              if (sym && paramNames.includes(callExpressionExpression.text)) {
                const index = paramNames.indexOf(callExpressionExpression.text)
                const arg = cloneNode(args[index], cloneOptions)
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
                  result = ts.visitEachChild(arg.body, replaceIdentifierVisitor, this.ctx).statements
                }
              }
            }
          } else if (ts.isIdentifier(newNode)) {
            const sym = checker.getSymbolAtLocation(newNode)?.valueDeclaration
            if (sym && paramNames.includes(newNode.text)) {
              const index = paramNames.indexOf(newNode.text)
              result = this.visitor(cloneNode(args[index], cloneOptions))
            }
          }

          if (!Array.isArray(result)) {
            result = this.visitor(result as Node)
          }

          if (Array.isArray(result)) {
            return result.map(n => ts.visitEachChild(n, macroBodyVisitor, this.ctx))
          }

          return ts.visitEachChild(result as Node, macroBodyVisitor, this.ctx)
        }
        const transformedBody = ts.visitEachChild(
          decl.body!,
          macroBodyVisitor,
          this.ctx
        )
        return transformedBody.statements
      }
    }

    return ts.visitEachChild(n, this.visitor, this.ctx)
  }
}

function createTransformerFactory (program: Program/* , config: unknown */): TransformerFactory<SourceFile> {
  // const defineKeys = Object.keys(defines)
  const typeChecker = program.getTypeChecker()
  return (context) => {
    const transform = new Transform(context, typeChecker)

    return (src) => {
      if (src.isDeclarationFile) return src

      const removeVisitor: Visitor = (n) => {
        if (ts.isFunctionDeclaration(n) && n.name && n.name.text.charAt(0) === '$' && n.name.text.length > 1) {
          return context.factory.createEmptyStatement()
        }
        return ts.visitEachChild(n, removeVisitor, context)
      }

      return ts.visitEachChild(
        ts.visitEachChild(src, transform.visitor, context),
        removeVisitor,
        context
      )
    }
  }
}

export default createTransformerFactory
