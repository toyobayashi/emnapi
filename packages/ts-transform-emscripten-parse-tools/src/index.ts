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
  Visitor,
  Block,
  FunctionLikeDeclaration,
  VariableStatement,
  NodeArray,
  VisitResult,
  Statement
} from 'typescript'
import { cloneNode, type CloneNodeOptions } from 'ts-clone-node'

import * as ts from 'typescript'
import { join, resolve } from 'path'
import { getDefaultBaseOptions, type BaseTransformOptions } from '@emnapi/ts-transform-emscripten-esm-library'

export type CStyleBoolean = 0 | 1

export interface Defines {
  MEMORY64?: CStyleBoolean
}

export interface TransformOptions extends BaseTransformOptions {
  defines?: Defines
}

// function isEmscriptenMacro (text: string): boolean {
//   return text.length > 1 && text.charAt(0) === '$' && text.charAt(1) !== '$'
// }

function expandFrom64 (factory: NodeFactory, defines: Record<string, any>, node: ExpressionStatement): Statement | undefined {
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
  return undefined
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

function parseExpression (input: string, factory?: NodeFactory): Expression {
  const expression: Expression = (ts.createSourceFile('', input, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS).statements[0] as ExpressionStatement).expression
  const cloneOptions: Partial<CloneNodeOptions<Expression>> = {
    typescript: ts,
    factory,
    setOriginalNodes: true,
    setParents: true,
    preserveComments: true,
    preserveSymbols: true
  }
  return cloneNode(expression, cloneOptions)
}

function byteOffsetParameter (factory: NodeFactory, defines: Record<string, any>, param: Expression): NumericLiteral | Expression {
  if (ts.isNumericLiteral(param)) {
    return factory.createNumericLiteral(param.text)
  }
  if (ts.isStringLiteral(param)) {
    return parseExpression(param.text, factory)
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
      return parseExpression(`${left.text as string}${defines.MEMORY64 ? '8' : '4'}`, factory)
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
  throw new Error('makeGetValue unsupported pos')
}

function isFunctionLikeDeclaration (node: Node): node is FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
}

function updateBody<N extends FunctionLikeDeclaration> (factory: NodeFactory, node: N, body: Block): N {
  if (ts.isFunctionDeclaration(node)) {
    return factory.updateFunctionDeclaration(node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      body
    ) as N
  }
  if (ts.isMethodDeclaration(node)) {
    return factory.updateMethodDeclaration(node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      body
    ) as N
  }
  if (ts.isConstructorDeclaration(node)) {
    return factory.updateConstructorDeclaration(node,
      node.modifiers,
      node.parameters,
      body
    ) as N
  }
  if (ts.isGetAccessorDeclaration(node)) {
    return factory.updateGetAccessorDeclaration(node,
      node.modifiers,
      node.name,
      node.parameters,
      node.type,
      body
    ) as N
  }
  if (ts.isSetAccessorDeclaration(node)) {
    return factory.updateSetAccessorDeclaration(node,
      node.modifiers,
      node.name,
      node.parameters,
      body
    ) as N
  }
  if (ts.isFunctionExpression(node)) {
    return factory.updateFunctionExpression(node,
      node.modifiers,
      node.asteriskToken,
      node.name,
      node.typeParameters,
      node.parameters,
      node.type,
      body
    ) as N
  }
  if (ts.isArrowFunction(node)) {
    return factory.updateArrowFunction(node,
      node.modifiers,
      node.typeParameters,
      node.parameters,
      node.type,
      node.equalsGreaterThanToken,
      body
    ) as N
  }

  throw new Error('unreachable')
}

class Transform {
  ctx: TransformationContext
  defines: Record<string, any>
  insertWasmMemoryImport: boolean
  insertWasmTableImport: boolean

  readonly runtimeModuleSpecifier: string
  readonly parseToolsModuleSpecifier: string

  constructor (public program: Program, context: TransformationContext, config?: TransformOptions) {
    const { runtimeModuleSpecifier, parseToolsModuleSpecifier } = getDefaultBaseOptions(config)
    this.runtimeModuleSpecifier = runtimeModuleSpecifier
    this.parseToolsModuleSpecifier = parseToolsModuleSpecifier

    this.ctx = context
    this.defines = config?.defines ?? {}
    this.visitor = this.visitor.bind(this)
    this.functionLikeDeclarationVisitor = this.functionLikeDeclarationVisitor.bind(this)
    this.insertWasmMemoryImport = false
    this.insertWasmTableImport = false
  }

  resetSource (): void {
    this.insertWasmMemoryImport = false
    this.insertWasmTableImport = false
  }

  createHeapDataViewDeclaration (): VariableStatement {
    return this.ctx.factory.createVariableStatement(
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
  }

  functionLikeDeclarationVisitor (node: Node): VisitResult<Node | undefined> {
    if (isFunctionLikeDeclaration(node)) {
      const statements = node.body
        ? ts.isBlock(node.body)
          ? node.body.statements
          : this.ctx.factory.createNodeArray([this.ctx.factory.createReturnStatement(node.body)])
        : this.ctx.factory.createNodeArray([])

      const newStatements = this.injectHeapDataViewDeclaration(statements)

      if (statements === newStatements) {
        return ts.visitEachChild(node, this.functionLikeDeclarationVisitor, this.ctx)
      }

      const newBody = this.ctx.factory.createBlock(newStatements, true)
      return updateBody(this.ctx.factory, node, newBody)
    }

    return ts.visitEachChild(node, this.functionLikeDeclarationVisitor, this.ctx)
  }

  injectHeapDataViewDeclaration (statements: NodeArray<Statement>): NodeArray<Statement> {
    const isIncludeGetOrSet: (statement?: Node) => boolean = (statement) => {
      if (!statement) return false
      let includeGetOrSet = false
      const statementVisitor: Visitor = (n) => {
        if (ts.isIdentifier(n) && n.text === 'HEAP_DATA_VIEW') {
          if (!this.insertWasmMemoryImport) {
            this.insertWasmMemoryImport = true
          }
          includeGetOrSet = true
        }
        return ts.visitEachChild(n, statementVisitor, this.ctx)
      }
      ts.visitEachChild(statement, statementVisitor, this.ctx)
      return includeGetOrSet
    }

    const statementIndex = [] as number[]
    for (let i = 0; i < statements.length; ++i) {
      const statement = statements[i]
      if (isIncludeGetOrSet(statement)) {
        statementIndex.push(i)
      }
    }

    if (statementIndex.length > 1) {
      const firstIndex = statementIndex[0]
      return this.ctx.factory.createNodeArray([
        ...statements.slice(0, firstIndex),
        this.createHeapDataViewDeclaration(),
        ...statements.slice(firstIndex)
      ])
    }
    if (statementIndex.length === 1) {
      const targetStatement = statements[statementIndex[0]]

      const injectVisitor: Visitor = (node) => {
        if (ts.isIfStatement(node)) {
          if (!isIncludeGetOrSet(node.elseStatement)) {
            return this.ctx.factory.updateIfStatement(node, node.expression,
              ts.isBlock(node.thenStatement)
                ? this.ctx.factory.updateBlock(node.thenStatement, this.injectHeapDataViewDeclaration(node.thenStatement.statements))
                : this.ctx.factory.createBlock(this.injectHeapDataViewDeclaration(this.ctx.factory.createNodeArray([node.thenStatement]))),
              node.elseStatement
                ? ts.isBlock(node.elseStatement)
                  ? this.ctx.factory.updateBlock(node.elseStatement, this.injectHeapDataViewDeclaration(node.elseStatement.statements))
                  : this.ctx.factory.createBlock(this.injectHeapDataViewDeclaration(this.ctx.factory.createNodeArray([node.elseStatement])))
                : node.elseStatement
            )
          }
        } else if (ts.isTryStatement(node)) {
          if (node.catchClause && !node.finallyBlock) {
            if (!isIncludeGetOrSet(node.catchClause)) {
              return this.ctx.factory.updateTryStatement(node,
                this.ctx.factory.updateBlock(node.tryBlock, this.injectHeapDataViewDeclaration(node.tryBlock.statements)),
                node.catchClause,
                node.finallyBlock
              )
            }
          } else if (!node.catchClause && node.finallyBlock) {
            if (!isIncludeGetOrSet(node.finallyBlock)) {
              return this.ctx.factory.updateTryStatement(node,
                this.ctx.factory.updateBlock(node.tryBlock, this.injectHeapDataViewDeclaration(node.tryBlock.statements)),
                node.catchClause,
                node.finallyBlock
              )
            }
          } else if (node.catchClause && node.finallyBlock) {
            if (!(isIncludeGetOrSet(node.catchClause) && isIncludeGetOrSet(node.finallyBlock))) {
              return this.ctx.factory.updateTryStatement(node,
                this.ctx.factory.updateBlock(node.tryBlock, this.injectHeapDataViewDeclaration(node.tryBlock.statements)),
                node.catchClause
                  ? this.ctx.factory.updateCatchClause(node.catchClause, node.catchClause.variableDeclaration, this.ctx.factory.updateBlock(node.catchClause.block, this.injectHeapDataViewDeclaration(node.catchClause.block.statements)))
                  : node.catchClause,
                node.finallyBlock
                  ? this.ctx.factory.updateBlock(node.finallyBlock, this.injectHeapDataViewDeclaration(node.finallyBlock.statements))
                  : node.finallyBlock
              )
            }
          } else {
            throw new Error('unreachable')
          }
        } else if (ts.isSwitchStatement(node)) {
          if (node.caseBlock.clauses.some((clause) => !isIncludeGetOrSet(clause))) {
            return this.ctx.factory.updateSwitchStatement(node, node.expression,
              this.ctx.factory.updateCaseBlock(node.caseBlock, node.caseBlock.clauses.map(clause => {
                if (ts.isCaseClause(clause)) {
                  return this.ctx.factory.updateCaseClause(clause, clause.expression, this.injectHeapDataViewDeclaration(clause.statements))
                }
                return this.ctx.factory.updateDefaultClause(clause, this.injectHeapDataViewDeclaration(clause.statements))
              }))
            )
          }
        } else if (ts.isBlock(node)) {
          return this.ctx.factory.updateBlock(node, this.injectHeapDataViewDeclaration(node.statements))
        }

        return ts.visitEachChild(node, this.functionLikeDeclarationVisitor, this.ctx)
      }

      const newStatement = ts.visitNode(targetStatement, injectVisitor) as Statement

      return this.ctx.factory.createNodeArray<Statement>([
        ...statements.slice(0, statementIndex[0]),
        ...(newStatement === targetStatement ? [this.createHeapDataViewDeclaration()] : []),
        newStatement,
        ...statements.slice(statementIndex[0] + 1)
      ], false)
    }
    return statements
  }

  isEmscriptenMacro (node: Node): boolean {
    const typeChecker = this.program.getTypeChecker()
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const d = typeChecker.getSymbolAtLocation(node.expression)?.declarations?.[0]
      if (d && ts.isImportSpecifier(d)) {
        const moduleSpecifier = d.parent.parent.parent.moduleSpecifier
        if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this.parseToolsModuleSpecifier) {
          return true
        }
      }
    }
    if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isImportEqualsDeclaration(node.parent) && !ts.isImportTypeNode(node.parent)) {
      const d = typeChecker.getSymbolAtLocation(node)?.declarations?.[0]
      if (d && ts.isImportSpecifier(d)) {
        const moduleSpecifier = d.parent.parent.parent.moduleSpecifier
        if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === this.parseToolsModuleSpecifier) {
          return true
        }
      }
    }
    return false
  }

  visitor (node: Node): VisitResult<Node | undefined> {
    if (ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        this.isEmscriptenMacro(node.expression.expression)
    ) {
      const functionName = node.expression.expression.text
      if (functionName === 'from64' && ts.isStringLiteral(node.expression.arguments[0])) {
        return expandFrom64(this.ctx.factory, this.defines, node)
      }
      return ts.visitEachChild(node, this.visitor, this.ctx)
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const functionName = node.expression.text
      if (this.isEmscriptenMacro(node.expression)) {
        if (functionName === 'to64' && ts.isStringLiteral(node.arguments[0])) {
          return expandTo64(this.ctx.factory, this.defines, node)
        }
        if (functionName === 'makeGetValue') {
          return this.expandMakeGetValue(node)
        }
        if (functionName === 'makeSetValue') {
          return this.expandMakeSetValue(node)
        }
        // if (functionName === '$makeMalloc') {
        //   return this.expandMakeMalloc(node)
        // }
        if (functionName === 'makeDynCall') {
          return this.expandMakeDynCall(node)
        }
        if (functionName === 'getUnsharedTextDecoderView') {
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
    if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent) && !ts.isImportClause(node.parent) && !ts.isImportEqualsDeclaration(node.parent) && !ts.isImportTypeNode(node.parent) && node.text === 'POINTER_SIZE') {
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
          throw new Error('makeGetValue Invalid type')
        }
      } else {
        throw new Error('makeGetValue Invalid type')
      }
    }

    return this.ctx.factory.createCallExpression(
      this.ctx.factory.createPropertyAccessExpression(
        this.ctx.factory.createIdentifier('HEAP_DATA_VIEW'),
        this.ctx.factory.createIdentifier(getDataViewGetMethod(this.defines, type))
      ),
      undefined,
      [
        ((ts.isNumericLiteral(argv1) || ts.isStringLiteral(argv1)) && argv1.text === '0')
          ? parseExpression(argv0.text, this.ctx.factory)
          : (this.ctx.factory.createBinaryExpression(
              parseExpression(argv0.text, this.ctx.factory),
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
          throw new Error('makeGetValue Invalid type')
        }
      } else {
        throw new Error('makeGetValue Invalid type')
      }
    }

    const methodName = getDataViewSetMethod(this.defines, type)
    return this.ctx.factory.createCallExpression(
      this.ctx.factory.createPropertyAccessExpression(
        this.ctx.factory.createIdentifier('HEAP_DATA_VIEW'),
        this.ctx.factory.createIdentifier(methodName)
      ),
      undefined,
      [
        ((ts.isNumericLiteral(argv1) || ts.isStringLiteral(argv1)) && argv1.text === '0')
          ? parseExpression(argv0.text, this.ctx.factory)
          : (this.ctx.factory.createBinaryExpression(
              parseExpression(argv0.text, this.ctx.factory),
              this.ctx.factory.createToken(ts.SyntaxKind.PlusToken),
              byteOffsetParameter(this.ctx.factory, this.defines, argv1)
            )),
        methodName === 'setBigInt64' || methodName === 'setBigUint64'
          ? (this.ctx.factory.createCallExpression(
              this.ctx.factory.createIdentifier('BigInt'),
              undefined,
              [parseExpression(argv2.text, this.ctx.factory)]
            ))
          : parseExpression(argv2.text, this.ctx.factory),
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
          [parseExpression(argv1.text, this.ctx.factory)]
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

    if (!this.insertWasmTableImport) {
      this.insertWasmTableImport = true
    }

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
              [parseExpression(argv1.text, this.ctx.factory)]
            ))
          : parseExpression(argv1.text, this.ctx.factory)
      ]
    ))
  }

  expandGetUnsharedTextDecoderView (node: CallExpression): Expression {
    const argv = node.arguments
    if (argv.length !== 3) {
      throw new Error('getUnsharedTextDecoderView argument length != 3')
    }

    const argv0 = argv[0]
    const argv1 = argv[1]
    const argv2 = argv[2]

    if (!ts.isStringLiteral(argv0) ||
        !ts.isStringLiteral(argv1) ||
        !ts.isStringLiteral(argv2)
    ) {
      throw new Error('getUnsharedTextDecoderView arguments include non string literal')
    }

    const heap = argv0.text
    const start = argv1.text
    const end = argv2.text

    const factory = this.ctx.factory
    return factory.createConditionalExpression(
      factory.createParenthesizedExpression(factory.createBinaryExpression(
        factory.createParenthesizedExpression(factory.createBinaryExpression(
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
        )),
        factory.createToken(ts.SyntaxKind.BarBarToken),
        factory.createParenthesizedExpression(factory.createBinaryExpression(
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createPropertyAccessExpression(
                factory.createPropertyAccessExpression(
                  factory.createIdentifier('Object'),
                  factory.createIdentifier('prototype')
                ),
                factory.createIdentifier('toString')
              ),
              factory.createIdentifier('call')
            ),
            undefined,
            [factory.createPropertyAccessExpression(
              factory.createPropertyAccessExpression(
                factory.createIdentifier(heap),
                factory.createIdentifier('buffer')
              ),
              factory.createIdentifier('constructor')
            )]
          ),
          factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
          factory.createStringLiteral('[object SharedArrayBuffer]')
        ))
      )),
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

function getImportsOfModule (src: SourceFile): string[] {
  const collection = new Set<string>()
  for (let i = 0; i < src.statements.length; ++i) {
    const s = src.statements[i]
    if (ts.isImportDeclaration(s)) {
      if (s.importClause && !s.importClause.isTypeOnly) {
        if (s.importClause.name) {
          collection.add(s.importClause.name.text)
        }
        if (s.importClause.namedBindings) {
          if (ts.isNamedImports(s.importClause.namedBindings)) {
            s.importClause.namedBindings.elements.filter(e => !e.isTypeOnly).forEach(sp => {
              collection.add(sp.name.text)
            })
          } else if (ts.isNamespaceImport(s.importClause.namedBindings)) {
            collection.add(s.importClause.namedBindings.name.text)
          }
        }
      }
    } else if (ts.isImportEqualsDeclaration(s)) {
      collection.add(s.name.text)
    }
  }
  return [...collection]
}

function createTransformerFactory (program: Program, config: TransformOptions): TransformerFactory<SourceFile> {
  // const defineKeys = Object.keys(defines)
  // const typeChecker = program.getTypeChecker()
  return (context) => {
    const transform = new Transform(program, context, config)

    return (src) => {
      if (src.isDeclarationFile) return src
      const factory = context.factory
      transform.resetSource()
      // expand emscripten macros
      const transformedSrc = ts.visitEachChild(src, transform.visitor, context)
      // inject HEAP_DATA_VIEW
      let injectedSrc = ts.visitEachChild(transformedSrc, transform.functionLikeDeclarationVisitor, context)

      const newStatements = injectedSrc.statements.filter(s => {
        return !(ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && (s.moduleSpecifier.text === transform.parseToolsModuleSpecifier))
      })

      injectedSrc = factory.updateSourceFile(injectedSrc, newStatements)

      const doNotInsertImport = join(import.meta.dirname, '../../emnapi/src/core/init.ts')

      if (process.platform === 'win32') {
        const resolvedFileName = resolve(src.fileName)
        if (resolvedFileName === doNotInsertImport) {
          return injectedSrc
        }
      } else {
        if (src.fileName === doNotInsertImport) {
          return injectedSrc
        }
      }

      let resultSrc = injectedSrc
      let importNames: string[] | null = null
      if (transform.insertWasmMemoryImport) {
        importNames = getImportsOfModule(resultSrc)
        if (!importNames.includes('wasmMemory')) {
          resultSrc = factory.updateSourceFile(resultSrc, [
            factory.createImportDeclaration(undefined,
              factory.createImportClause(false, undefined,
                factory.createNamedImports([
                  factory.createImportSpecifier(false, undefined, factory.createIdentifier('wasmMemory'))
                ])
              ),
              factory.createStringLiteral(transform.runtimeModuleSpecifier),
              undefined
            ),
            ...resultSrc.statements
          ])
        }
      }
      if (transform.insertWasmTableImport) {
        importNames = getImportsOfModule(resultSrc)
        if (!importNames.includes('wasmTable')) {
          resultSrc = factory.updateSourceFile(resultSrc, [
            factory.createImportDeclaration(undefined,
              factory.createImportClause(false, undefined,
                factory.createNamedImports([
                  factory.createImportSpecifier(false, undefined, factory.createIdentifier('wasmTable'))
                ])
              ),
              factory.createStringLiteral(transform.runtimeModuleSpecifier),
              undefined
            ),
            ...resultSrc.statements
          ])
        }
      }

      return resultSrc
    }
  }
}

export { createTransformerFactory }
