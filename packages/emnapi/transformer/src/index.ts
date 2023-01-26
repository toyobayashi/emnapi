import type {
  TransformerFactory,
  SourceFile,
  Visitor,
  Program,
  ExpressionStatement,
  NodeFactory,
  CallExpression,
  StringLiteral,
  NumericLiteral,
  Expression,
  Statement
} from 'typescript'

import * as ts from 'typescript'

export interface DefineOptions {
  defines?: Record<string, any>
}

function isEmscriptenMacro (text: string): boolean {
  return text.length > 1 && text.charAt(0) === '$' && text.charAt(1) !== '$'
}

function expandFrom64 (factory: NodeFactory, defines: Record<string, any>, node: ExpressionStatement): Statement {
  if (defines.MEMORY64) {
    const varName = ((node.expression as CallExpression).arguments[0] as StringLiteral).text
    if (!varName) return node
    return factory.createExpressionStatement(factory.createBinaryExpression(
      factory.createIdentifier(varName),
      factory.createToken(ts.SyntaxKind.EqualsToken),
      factory.createCallExpression(
        factory.createIdentifier('Number'),
        undefined,
        [factory.createIdentifier(varName)]
      )
    ))
  }
  return factory.createEmptyStatement()
}

function expandTo64 (factory: NodeFactory, defines: Record<string, any>, node: ExpressionStatement): Statement {
  if (defines.MEMORY64) {
    const varName = ((node.expression as CallExpression).arguments[0] as StringLiteral).text
    if (!varName) return node
    return factory.createExpressionStatement(factory.createCallExpression(
      factory.createIdentifier('BigInt'),
      undefined,
      [factory.createIdentifier(varName)]
    ))
  }
  return factory.createEmptyStatement()
}

type Type = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'i64' | 'u64' | 'float' | 'double' | '*'

function getDataViewGetMethod (defines: Record<string, any>, type: Type): string {
  switch (type) {
    case 'i8': return 'getInt8'
    case 'u8': return 'getUint8'
    case 'i16': return 'getInt16'
    case 'u16': return 'getUint16'
    case 'i32': return 'getInt32'
    case 'u32': return 'getUint32'
    case 'i64': return 'getBigInt64'
    case 'u64': return 'getBigUint64'
    case 'float': return 'getFloat32'
    case 'double': return 'getFloat64'
    case '*': return defines.MEMORY64 ? 'getBigInt64' : 'getInt32'
    default: throw new Error(`unknown data type: ${type as string}`)
  }
}

/* function getDataViewSetMethod (defines: Record<string, any>, type: Type): string {
  switch (type) {
    case 'i8': return 'setInt8'
    case 'u8': return 'setUint8'
    case 'i16': return 'setInt16'
    case 'u16': return 'setUint16'
    case 'i32': return 'setInt32'
    case 'u32': return 'setUint32'
    case 'i64': return 'setBigInt64'
    case 'u64': return 'setBigUint64'
    case 'float': return 'setFloat32'
    case 'double': return 'setFloat64'
    case '*': return defines.MEMORY64 ? 'setBigInt64' : 'setInt32'
    default: throw new Error(`unknown data type: ${type as string}`)
  }
} */

function byteOffsetParameter (factory: NodeFactory, defines: Record<string, any>, param: Expression): NumericLiteral | Expression {
  if (ts.isNumericLiteral(param) || ts.isStringLiteral(param)) {
    return factory.createNumericLiteral(param.text)
  }
  if (ts.isIdentifier(param)) {
    if (param.text === 'POINTER_SIZE') {
      return factory.createNumericLiteral(defines.MEMORY64 ? 8 : 4)
    }
  }
  if (ts.isBinaryExpression(param)) {
    if (param.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = param.left
      const right = param.right
      if (!ts.isStringLiteral(left)) throw new Error('left must be string literal')
      if (!ts.isIdentifier(right)) throw new Error('right must be identifier')
      if (right.text !== 'POINTER_SIZE') throw new Error('right.text !== "POINTER_SIZE"')
      return factory.createNumericLiteral(`${left.text as string}${defines.MEMORY64 ? '8' : '4'}`)
    }
    if (param.operatorToken.kind === ts.SyntaxKind.AsteriskToken) {
      const left = param.left
      const right = param.right
      if (!ts.isIdentifier(left)) throw new Error('left must be identifier')
      if (!ts.isNumericLiteral(right)) throw new Error('right must be number literal')
      if (left.text !== 'POINTER_SIZE') throw new Error('left.text !== "POINTER_SIZE"')
      return factory.createNumericLiteral((defines.MEMORY64 ? 8 : 4) * Number(right.text))
    }
    throw new Error('byteOffsetParameter unsupport binary expression')
  }
  throw new Error('$makeGetValue unsupported pos')
}

function expandMakeGetValue (factory: NodeFactory, defines: Record<string, any>, node: CallExpression): Expression {
  const callexp = node
  const argv0 = callexp.arguments[0]
  const argv1 = callexp.arguments[1]
  const argv2 = callexp.arguments[2]
  if (!ts.isStringLiteral(argv0)) return node
  const pointerName = argv0.text
  if (!pointerName) return node
  let type: Type
  if (ts.isStringLiteral(argv2)) {
    type = argv2.text as Type
  } else {
    if (ts.isIdentifier(argv2)) {
      if (argv2.text === 'SIZE_TYPE') {
        type = defines.MEMORY64 ? 'u64' : 'u32'
      } else if (argv2.text === 'POINTER_WASM_TYPE') {
        type = defines.MEMORY64 ? 'i64' : 'i32'
      } else {
        throw new Error('$makeGetValue Invalid type')
      }
    } else {
      throw new Error('$makeGetValue Invalid type')
    }
  }

  const byteOffset = byteOffsetParameter(factory, defines, argv1)

  return factory.createCallExpression(
    factory.createPropertyAccessExpression(
      factory.createNewExpression(
        factory.createIdentifier('DataView'),
        undefined,
        [factory.createPropertyAccessExpression(
          factory.createIdentifier('wasmMemory'),
          factory.createIdentifier('buffer')
        )]
      ),
      factory.createIdentifier(getDataViewGetMethod(defines, type))
    ),
    undefined,
    [
      byteOffset,
      factory.createTrue()
    ]
  )
}

function createTransformerFactory (_program: Program, config: DefineOptions): TransformerFactory<SourceFile> {
  const defines = config.defines ?? {}
  // const defineKeys = Object.keys(defines)
  // const typeChecker = program.getTypeChecker()
  return (context) => {
    const factory = context.factory

    const visitor: Visitor = (node) => {
      if (ts.isExpressionStatement(node) &&
          ts.isCallExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          isEmscriptenMacro(node.expression.expression.text as string)
      ) {
        const functionName = node.expression.expression.text
        if (functionName === '$from64' && ts.isStringLiteral(node.expression.arguments[0])) {
          return expandFrom64(factory, defines, node)
        }
        if (functionName === '$to64' && ts.isStringLiteral(node.expression.arguments[0])) {
          return expandTo64(factory, defines, node)
        }
        return ts.visitEachChild(node, visitor, context)
      }
      if (ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          isEmscriptenMacro(node.expression.text as string)
      ) {
        const functionName = node.expression.text
        if (functionName === '$makeGetValue') {
          return expandMakeGetValue(factory, defines, node)
        }
        return ts.visitEachChild(node, visitor, context)
      }
      return ts.visitEachChild(node, visitor, context)
    }

    return (src) => {
      if (src.isDeclarationFile) return src
      return ts.visitEachChild(src, visitor, context)
    }
  }
}

export default createTransformerFactory
