import type {
  TransformerFactory,
  SourceFile,
  // Visitor,
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
import { cloneNode, CloneNodeOptions } from 'ts-clone-node'

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

  constEnumVisitor (node: Node): VisitResult<Node> {
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
    // const factory = this.ctx.factory
    const checker = this.typeChecker

    if ((ts.isExpressionStatement(n) && isMacroCall(n.expression)) || (ts.isReturnStatement(n) && n.expression && isMacroCall(n.expression))) {
      const node = n.expression
      // const macroName = ((node.expression as NonNullExpression).expression as Identifier).text

      const cloneOptions: Partial<CloneNodeOptions<any>> = {
        typescript: ts,
        factory: this.ctx.factory,
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
        const visitor: ts.Visitor = (nodeInMacro) => {
          let result: VisitResult<Node> = this.constEnumVisitor(nodeInMacro)
          if (ts.isIdentifier(nodeInMacro)) {
            const sym = checker.getSymbolAtLocation(nodeInMacro)?.valueDeclaration
            if (sym && paramNames.includes(nodeInMacro.text)) {
              const index = paramNames.indexOf(nodeInMacro.text)
              result = cloneNode(args[index], cloneOptions)
            }
          }

          result = this.visitor(result as Node)

          if (Array.isArray(result)) {
            return result.map(n => ts.visitEachChild(n, visitor, this.ctx))
          }

          return ts.visitEachChild(result as Node, visitor, this.ctx)
        }
        const transformedBody = ts.visitEachChild(
          decl.body!,
          visitor,
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

      const removeVisitor: ts.Visitor<Node> = (n) => {
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
