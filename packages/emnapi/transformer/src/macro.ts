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
import { cloneNode } from 'ts-clone-node'

/*

function $CHECK_ENV (env: napi_env): any {
  if (env == 0) return napi_status.napi_invalid_arg
}

function $CHECK_ARG (env: Env, arg: void_p): any {
  if (arg == 0) return env.setLastError(napi_status.napi_invalid_arg)
}

function $PREAMBLE (env: number, fn: (envObject: Env) => napi_status): napi_status {
  if (env == 0) return napi_status.napi_invalid_arg
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.checkGCAccess()
  if (envObject.tryCatch.hasCaught()) return envObject.setLastError(napi_status.napi_pending_exception)
  if (!envObject.canCallIntoJs()) {
    return envObject.setLastError(
      envObject.moduleApiVersion === Version.NAPI_VERSION_EXPERIMENTAL
        ? napi_status.napi_cannot_run_js
        : napi_status.napi_pending_exception
    )
  }
  envObject.clearLastError()
  try {
    return fn(envObject)
  } catch (err) {
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
}

*/

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
  }

  expandPreamble (factory: ts.NodeFactory, args: ts.NodeArray<ts.Expression>): ts.Statement[] {
    if (!ts.isIdentifier(args[0])) throw new Error('$PREAMBLE!() the first argument is not identifier')
    if (!ts.isArrowFunction(args[1])) throw new Error('$PREAMBLE!() the second argument is not arrow function')
    const param0 = args[1].parameters[0]?.name.getText() ?? 'envObject'

    return [
      factory.createIfStatement(
        factory.createPrefixUnaryExpression(
          ts.SyntaxKind.ExclamationToken,
          factory.createIdentifier(args[0].text)
        ),
        factory.createReturnStatement(ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(napi_status.napi_invalid_arg)), ts.SyntaxKind.MultiLineCommentTrivia, ' napi_status.napi_invalid_arg ')),
        undefined
      ),
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier(param0),
            undefined,
            undefined,
            factory.createNonNullExpression(factory.createCallExpression(
              factory.createPropertyAccessExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier('emnapiCtx'),
                  factory.createIdentifier('envStore')
                ),
                factory.createIdentifier('get')
              ),
              undefined,
              [factory.createIdentifier(args[0].text)]
            ))
          )],
          ts.NodeFlags.Const
        )
      ),
      factory.createExpressionStatement(factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier(param0),
          factory.createIdentifier('checkGCAccess')
        ),
        undefined,
        []
      )),
      factory.createIfStatement(
        factory.createCallExpression(
          factory.createPropertyAccessExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier(param0),
              factory.createIdentifier('tryCatch')
            ),
            factory.createIdentifier('hasCaught')
          ),
          undefined,
          []
        ),
        factory.createReturnStatement(factory.createCallExpression(
          factory.createPropertyAccessExpression(
            factory.createIdentifier(param0),
            factory.createIdentifier('setLastError')
          ),
          undefined,
          [
            ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(napi_status.napi_pending_exception)), ts.SyntaxKind.MultiLineCommentTrivia, ' napi_status.napi_pending_exception ')
          ]
        )),
        undefined
      ),
      factory.createIfStatement(
        factory.createPrefixUnaryExpression(
          ts.SyntaxKind.ExclamationToken,
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier(param0),
              factory.createIdentifier('canCallIntoJs')
            ),
            undefined,
            []
          )
        ),
        factory.createBlock(
          [factory.createReturnStatement(factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier(param0),
              factory.createIdentifier('setLastError')
            ),
            undefined,
            [factory.createConditionalExpression(
              factory.createBinaryExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(param0),
                  factory.createIdentifier('moduleApiVersion')
                ),
                factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(Version.NAPI_VERSION_EXPERIMENTAL)), ts.SyntaxKind.MultiLineCommentTrivia, ' Version.NAPI_VERSION_EXPERIMENTAL ')
              ),
              factory.createToken(ts.SyntaxKind.QuestionToken),
              ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(napi_status.napi_cannot_run_js)), ts.SyntaxKind.MultiLineCommentTrivia, ' napi_status.napi_cannot_run_js '),
              factory.createToken(ts.SyntaxKind.ColonToken),
              ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(napi_status.napi_pending_exception)), ts.SyntaxKind.MultiLineCommentTrivia, ' napi_status.napi_pending_exception ')
            )]
          ))],
          true
        ),
        undefined
      ),
      factory.createExpressionStatement(factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier(param0),
          factory.createIdentifier('clearLastError')
        ),
        undefined,
        []
      )),
      factory.createTryStatement(
        factory.createBlock(
          [...ts.visitEachChild(args[1].body as ts.Block, this.visitor, this.ctx).statements],
          true
        ),
        factory.createCatchClause(
          factory.createVariableDeclaration(
            factory.createIdentifier('err'),
            undefined,
            undefined,
            undefined
          ),
          factory.createBlock(
            [
              factory.createExpressionStatement(factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createPropertyAccessExpression(
                    factory.createIdentifier(param0),
                    factory.createIdentifier('tryCatch')
                  ),
                  factory.createIdentifier('setError')
                ),
                undefined,
                [factory.createIdentifier('err')]
              )),
              factory.createReturnStatement(factory.createCallExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier(param0),
                  factory.createIdentifier('setLastError')
                ),
                undefined,
                [
                  ts.addSyntheticTrailingComment(factory.createNumericLiteral(String(napi_status.napi_pending_exception)), ts.SyntaxKind.MultiLineCommentTrivia, ' napi_status.napi_pending_exception ')
                ]
              ))
            ],
            true
          )
        ),
        undefined
      )
    ]
  }

  visitor (n: Node): VisitResult<Node> {
    const factory = this.ctx.factory
    const checker = this.typeChecker

    if (ts.isFunctionDeclaration(n) && n.name && n.name.text.charAt(0) === '$' && n.name.text.length > 1) {
      return factory.createEmptyStatement()
    }

    if ((ts.isExpressionStatement(n) && isMacroCall(n.expression)) || (ts.isReturnStatement(n) && n.expression && isMacroCall(n.expression))) {
      const node = n.expression
      const macroName = ((node.expression as NonNullExpression).expression as Identifier).text

      if (macroName === '$PREAMBLE') {
        return this.expandPreamble(factory, node.arguments)
      }

      const type = checker.getTypeAtLocation((node.expression as NonNullExpression).expression as Identifier)
      const valueDeclaration = type.getSymbol()?.valueDeclaration
      if (valueDeclaration && ts.isFunctionDeclaration(valueDeclaration) && valueDeclaration.body) {
        const decl = cloneNode(valueDeclaration, { setOriginalNodes: true })
        const paramNames = valueDeclaration.parameters.map(p => p.name.getText())
        const visitor: ts.Visitor = (nodeInMacro) => {
          let result: VisitResult<Node> = nodeInMacro
          if (ts.isPropertyAccessExpression(nodeInMacro) && ts.isIdentifier(nodeInMacro.expression)) {
            const enumValue = checker.getConstantValue(nodeInMacro)
            if (typeof enumValue === 'number') {
              result = ts.addSyntheticTrailingComment(
                factory.createNumericLiteral(enumValue),
                ts.SyntaxKind.MultiLineCommentTrivia,
                ` ${nodeInMacro.expression.text as string}.${nodeInMacro.name.text as string} `,
                false
              )
            } else if (typeof enumValue === 'string') {
              result = ts.addSyntheticTrailingComment(
                factory.createStringLiteral(enumValue),
                ts.SyntaxKind.MultiLineCommentTrivia,
                ` ${nodeInMacro.expression.text as string}.${nodeInMacro.name.text as string} `,
                false
              )
            }
          } else if (ts.isIdentifier(nodeInMacro)) {
            const sym = checker.getSymbolAtLocation(nodeInMacro)?.valueDeclaration
            if (sym && paramNames.includes(nodeInMacro.text)) {
              const index = paramNames.indexOf(nodeInMacro.text)
              result = cloneNode(node.arguments[index])
            }
          }

          result = this.visitor(result)

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

      return ts.visitEachChild(n, this.visitor, this.ctx)
    }

    if (ts.isReturnStatement(n) && n.expression && isMacroCall(n.expression)) {
      const node = n.expression
      const macroName = ((node.expression as NonNullExpression).expression as Identifier).text
      const factory = this.ctx.factory
      if (macroName === '$PREAMBLE') {
        return this.expandPreamble(factory, node.arguments)
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
      return ts.visitEachChild(src, transform.visitor, context)
    }
  }
}

export default createTransformerFactory
