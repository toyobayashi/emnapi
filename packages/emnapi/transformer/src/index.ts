import type {
  TransformerFactory,
  SourceFile,
  // Visitor,
  Program,
  ExpressionStatement,
  NodeFactory,
  CallExpression,
  StringLiteral,
  NumericLiteral,
  Expression,
  TransformationContext,
  Node,
  VisitResult,
  FunctionDeclaration,
  FunctionExpression,
  MethodDeclaration,
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

function expandTo64 (factory: NodeFactory, defines: Record<string, any>, node: CallExpression): Expression {
  const varName = (node.arguments[0] as StringLiteral).text
  if (defines.MEMORY64) {
    if (!varName) return node
    return factory.createCallExpression(
      factory.createIdentifier('BigInt'),
      undefined,
      [factory.createIdentifier(varName)]
    )
  }
  return factory.createIdentifier(varName)
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

function getDataViewSetMethod (defines: Record<string, any>, type: Type): string {
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
}

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

class Transform {
  ctx: TransformationContext
  functionDeclarations: Array<FunctionDeclaration | FunctionExpression | MethodDeclaration>
  injectDataViewDecl: boolean
  defines: Record<string, any>

  constructor (context: TransformationContext, defines: Record<string, any>) {
    this.ctx = context
    this.functionDeclarations = []
    this.injectDataViewDecl = false
    this.defines = defines
    this.visitor = this.visitor.bind(this)
  }

  visitor (node: Node): VisitResult<Node> {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) {
      this.functionDeclarations.push(node)
      const result = ts.visitEachChild(node, this.visitor, this.ctx)
      this.functionDeclarations.pop()
      const statements = result.body?.statements ?? []
      if (this.injectDataViewDecl && this.functionDeclarations.length === 0) {
        this.injectDataViewDecl = false
        const decl = this.ctx.factory.createVariableStatement(
          undefined,
          this.ctx.factory.createVariableDeclarationList(
            [this.ctx.factory.createVariableDeclaration(
              this.ctx.factory.createIdentifier('HEAP_DATA_VIEW'),
              undefined,
              undefined,
              this.ctx.factory.createNewExpression(
                this.ctx.factory.createIdentifier('DataView'),
                undefined,
                [this.ctx.factory.createPropertyAccessExpression(
                  this.ctx.factory.createIdentifier('wasmMemory'),
                  this.ctx.factory.createIdentifier('buffer')
                )]
              )
            )],
            ts.NodeFlags.None
          )
        )
        const modifiers = ts.getModifiers(result)!
        const asteriskToken = result.asteriskToken
        const name = result.name!
        const questionToken = result.questionToken
        const typeParameters = result.typeParameters
        const parameters = result.parameters
        const type = result.type
        const body = this.ctx.factory.createBlock(
          this.ctx.factory.createNodeArray([
            decl,
            ...statements
          ]),
          true
        )
        if (ts.isMethodDeclaration(node)) {
          return this.ctx.factory.updateMethodDeclaration(
            result as MethodDeclaration,
            modifiers,
            asteriskToken,
            name,
            questionToken,
            typeParameters,
            parameters,
            type,
            body
          )
        }
        const method = ts.isFunctionDeclaration(node)
          ? 'updateFunctionDeclaration'
          : 'updateFunctionExpression'
        return this.ctx.factory[method](
          result as any,
          modifiers,
          asteriskToken,
          name as any,
          typeParameters,
          parameters,
          type,
          body
        )
      }
      return result
    }

    if (ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        isEmscriptenMacro(node.expression.expression.text as string)
    ) {
      const functionName = node.expression.expression.text
      if (functionName === '$from64' && ts.isStringLiteral(node.expression.arguments[0])) {
        return expandFrom64(this.ctx.factory, this.defines, node)
      }
      return ts.visitEachChild(node, this.visitor, this.ctx)
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text
      if (isEmscriptenMacro(functionName)) {
        if (functionName === '$to64' && ts.isStringLiteral(node.arguments[0])) {
          return expandTo64(this.ctx.factory, this.defines, node)
        }
        if (functionName === '$makeGetValue') {
          return this.expandMakeGetValue(node)
        }
        if (functionName === '$makeSetValue') {
          return this.expandMakeSetValue(node)
        }
        // if (functionName === '$makeMalloc') {
        //   return this.expandMakeMalloc(node)
        // }
        if (functionName === '$makeDynCall') {
          return this.expandMakeDynCall(node)
        }
        if (functionName === '$getUnsharedTextDecoderView') {
          return this.expandGetUnsharedTextDecoderView(node)
        }
      }
      const removeDeps = [
        'emnapiImplement',
        'emnapiImplement2',
        'emnapiImplementInternal',
        'emnapiImplementHelper'
      ]
      if (removeDeps.includes(functionName)) {
        const arr = node.arguments.slice()
        if (arr.length > 3) {
          arr[3] = this.ctx.factory.createIdentifier('undefined')
        }
        return this.ctx.factory.updateCallExpression(
          node,
          node.expression,
          node.typeArguments,
          this.ctx.factory.createNodeArray(arr, node.arguments.hasTrailingComma)
        )
      }
      if (functionName === 'emnapiDefineVar') {
        const arr = node.arguments.slice()
        if (arr.length > 2) {
          arr[2] = this.ctx.factory.createIdentifier('undefined')
        }
        if (ts.isStringLiteral(arr[3])) {
          const factory = this.ctx.factory
          const source = ts.createSourceFile('/emnapiDefineVar_' + (arr[0] as StringLiteral).text, (arr[3] as StringLiteral).text, ts.ScriptTarget.ES5, true, ts.ScriptKind.JS)
          arr[3] = factory.createFunctionExpression(
            undefined,
            undefined,
            undefined,
            undefined,
            [],
            undefined,
            factory.createBlock(
              [...source.statements],
              true
            )
          )
        }
        return this.ctx.factory.updateCallExpression(
          node,
          node.expression,
          node.typeArguments,
          this.ctx.factory.createNodeArray(arr, node.arguments.hasTrailingComma)
        )
      }
      return ts.visitEachChild(node, this.visitor, this.ctx)
    }
    if (ts.isIdentifier(node) && node.text === '$POINTER_SIZE') {
      return this.ctx.factory.createNumericLiteral(this.defines.MEMORY64 ? 8 : 4)
    }
    return ts.visitEachChild(node, this.visitor, this.ctx)
  }

  expandMakeGetValue (node: CallExpression): Expression {
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
          type = this.defines.MEMORY64 ? 'u64' : 'u32'
        } else if (argv2.text === 'POINTER_WASM_TYPE') {
          type = this.defines.MEMORY64 ? 'i64' : 'i32'
        } else {
          throw new Error('$makeGetValue Invalid type')
        }
      } else {
        throw new Error('$makeGetValue Invalid type')
      }
    }

    this.injectDataViewDecl = true
    return this.ctx.factory.createCallExpression(
      this.ctx.factory.createPropertyAccessExpression(
        this.ctx.factory.createIdentifier('HEAP_DATA_VIEW'),
        this.ctx.factory.createIdentifier(getDataViewGetMethod(this.defines, type))
      ),
      undefined,
      [
        ((ts.isNumericLiteral(argv1) || ts.isStringLiteral(argv1)) && argv1.text === '0')
          ? this.ctx.factory.createNumericLiteral(argv0.text)
          : (this.ctx.factory.createBinaryExpression(
              this.ctx.factory.createNumericLiteral(argv0.text),
              this.ctx.factory.createToken(ts.SyntaxKind.PlusToken),
              byteOffsetParameter(this.ctx.factory, this.defines, argv1)
            )),
        this.ctx.factory.createTrue()
      ]
    )
  }

  expandMakeSetValue (node: CallExpression): Expression {
    const callexp = node
    const argv0 = callexp.arguments[0]
    const argv1 = callexp.arguments[1]
    const argv2 = callexp.arguments[2]
    const argv3 = callexp.arguments[3]
    if (!ts.isStringLiteral(argv0)) return node
    if (!ts.isStringLiteral(argv2)) return node
    const pointerName = argv0.text
    if (!pointerName) return node
    let type: Type
    if (ts.isStringLiteral(argv3)) {
      type = argv3.text as Type
    } else {
      if (ts.isIdentifier(argv3)) {
        if (argv3.text === 'SIZE_TYPE') {
          type = this.defines.MEMORY64 ? 'u64' : 'u32'
        } else if (argv3.text === 'POINTER_WASM_TYPE') {
          type = this.defines.MEMORY64 ? 'i64' : 'i32'
        } else {
          throw new Error('$makeGetValue Invalid type')
        }
      } else {
        throw new Error('$makeGetValue Invalid type')
      }
    }

    this.injectDataViewDecl = true
    const methodName = getDataViewSetMethod(this.defines, type)
    return this.ctx.factory.createCallExpression(
      this.ctx.factory.createPropertyAccessExpression(
        this.ctx.factory.createIdentifier('HEAP_DATA_VIEW'),
        this.ctx.factory.createIdentifier(methodName)
      ),
      undefined,
      [
        ((ts.isNumericLiteral(argv1) || ts.isStringLiteral(argv1)) && argv1.text === '0')
          ? this.ctx.factory.createNumericLiteral(argv0.text)
          : (this.ctx.factory.createBinaryExpression(
              this.ctx.factory.createNumericLiteral(argv0.text),
              this.ctx.factory.createToken(ts.SyntaxKind.PlusToken),
              byteOffsetParameter(this.ctx.factory, this.defines, argv1)
            )),
        methodName === 'setBigInt64' || methodName === 'setBigUint64'
          ? (this.ctx.factory.createCallExpression(
              this.ctx.factory.createIdentifier('BigInt'),
              undefined,
              [this.ctx.factory.createNumericLiteral(argv2.text)]
            ))
          : this.ctx.factory.createNumericLiteral(argv2.text),
        this.ctx.factory.createTrue()
      ]
    )
  }

  expandMakeMalloc (node: CallExpression): Expression {
    const callexp = node
    const argv0 = callexp.arguments[0]
    const argv1 = callexp.arguments[1]
    if (!ts.isStringLiteral(argv0)) return node
    if (!ts.isStringLiteral(argv1)) return node
    const pointerName = argv1.text
    if (!pointerName) return node

    return this.ctx.factory.createCallExpression(
      this.ctx.factory.createIdentifier('_malloc'),
      undefined,
      [
        this.ctx.factory.createCallExpression(
          this.ctx.factory.createIdentifier(this.defines.MEMORY64 ? 'BigInt' : 'Number'),
          undefined,
          [this.ctx.factory.createNumericLiteral(argv1.text)]
        )
      ]
    )
  }

  expandMakeDynCall (node: CallExpression): Expression {
    const callexp = node
    const argv0 = callexp.arguments[0]
    const argv1 = callexp.arguments[1]
    if (!ts.isStringLiteral(argv0)) return node
    if (!ts.isStringLiteral(argv1)) return node
    const pointerName = argv1.text
    if (!pointerName) return node

    return this.ctx.factory.createParenthesizedExpression(this.ctx.factory.createCallExpression(
      this.ctx.factory.createPropertyAccessExpression(
        this.ctx.factory.createIdentifier('wasmTable'),
        this.ctx.factory.createIdentifier('get')
      ),
      undefined,
      [
        this.defines.MEMORY64
          ? (this.ctx.factory.createCallExpression(
              this.ctx.factory.createIdentifier('Number'),
              undefined,
              [this.ctx.factory.createNumericLiteral(argv1.text)]
            ))
          : this.ctx.factory.createNumericLiteral(argv1.text)
      ]
    ))
  }

  expandGetUnsharedTextDecoderView (node: CallExpression): Expression {
    const argv = node.arguments
    if (argv.length !== 3) {
      throw new Error('$getUnsharedTextDecoderView argument length != 3')
    }

    const argv0 = argv[0]
    const argv1 = argv[1]
    const argv2 = argv[2]

    if (!ts.isStringLiteral(argv0) ||
        !ts.isStringLiteral(argv1) ||
        !ts.isStringLiteral(argv2)
    ) {
      throw new Error('$getUnsharedTextDecoderView arguments include non string literal')
    }

    const heap = argv0.text
    const start = argv1.text
    const end = argv2.text

    const factory = this.ctx.factory
    return factory.createConditionalExpression(
      factory.createBinaryExpression(
        factory.createBinaryExpression(
          factory.createTypeOfExpression(factory.createIdentifier('SharedArrayBuffer')),
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createStringLiteral('function')
        ),
        factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
        factory.createBinaryExpression(
          factory.createPropertyAccessExpression(
            factory.createIdentifier(heap),
            factory.createIdentifier('buffer')
          ),
          factory.createToken(ts.SyntaxKind.InstanceOfKeyword),
          factory.createIdentifier('SharedArrayBuffer')
        )
      ),
      factory.createToken(ts.SyntaxKind.QuestionToken),
      factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier(heap),
          factory.createIdentifier('slice')
        ),
        undefined,
        [
          factory.createIdentifier(start),
          factory.createIdentifier(end)
        ]
      ),
      factory.createToken(ts.SyntaxKind.ColonToken),
      factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier(heap),
          factory.createIdentifier('subarray')
        ),
        undefined,
        [
          factory.createIdentifier(start),
          factory.createIdentifier(end)
        ]
      )
    )
  }
}

function createTransformerFactory (_program: Program, config: DefineOptions): TransformerFactory<SourceFile> {
  const defines = config.defines ?? {}
  // const defineKeys = Object.keys(defines)
  // const typeChecker = program.getTypeChecker()
  return (context) => {
    const transform = new Transform(context, defines)

    return (src) => {
      if (src.isDeclarationFile) return src
      return ts.visitEachChild(src, transform.visitor, context)
    }
  }
}

export default createTransformerFactory
