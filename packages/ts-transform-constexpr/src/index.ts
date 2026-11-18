import type {
  Node,
  SourceFile,
  Statement,
  NodeArray,
  IfStatement
} from 'typescript/ast'

import type { Program, Checker as TypeChecker } from 'typescript/sync'
import {
  createTsCompat,
  preserveTextRange,
  visitNodeArray,
  type TransformationContext,
  type VisitResult,
  type TransformerFactory
} from '@emnapi/shared/transformer-compat'

const ts = createTsCompat()

export type Mode = 'evaluate' | 'preserve'

export interface TransformOptions {
  mode?: Mode
  defines?: Record<string, unknown>
}

class Transformer {
  private readonly checker: TypeChecker
  private readonly mode: Mode
  private readonly defines: Record<string, unknown>

  constructor (private readonly program: Program, private readonly context: TransformationContext, options: TransformOptions) {
    this.checker = program.getProject().checker
    this.mode = options.mode ?? 'evaluate'
    this.defines = options.defines ?? {}
    this.visitor = this.visitor.bind(this)
  }

  private resolveDeclaration (handle: any): Node | undefined {
    return handle?.resolve(this.program.getProject()) as Node | undefined
  }

  private isImported (node: Node): boolean {
    if (!ts.isIdentifier(node)) return false
    const declarations = this.checker.getSymbolAtLocation(node)?.declarations ?? []
    return declarations.some(handle => {
      const declaration = this.resolveDeclaration(handle)
      return Boolean(declaration && (
        ts.isImportSpecifier(declaration) ||
        ts.isImportClause(declaration) ||
        ts.isImportEqualsDeclaration(declaration) ||
        ts.isNamespaceImport(declaration)
      ))
    })
  }

  private isConstexprCall (node: Node): node is import('typescript/ast').CallExpression {
    return ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'constexpr' &&
      !this.isImported(node.expression)
  }

  private getCondition (node: IfStatement): string {
    if (!this.isConstexprCall(node.expression) || !ts.isStringLiteral(node.expression.arguments[0])) {
      throw new Error('constexpr expects a string literal condition')
    }
    return node.expression.arguments[0].text
  }

  private evaluate (condition: string): boolean {
    const expression = condition.replace(/defined\((.+?)\)/g, (_substring, name: string) => {
      return `(${typeof this.defines[name] !== 'undefined'})`
    })
    try {
      return Boolean((new Function('context', `with (context) { return (${expression}) }`))({ ...this.defines }))
    } catch (_) {
      return false
    }
  }

  private visitStatement (statement: Statement): Statement[] {
    const result = this.visitor(statement)
    if (result === undefined) return []
    return Array.isArray(result) ? result as Statement[] : [result as Statement]
  }

  private visitBranch (statement: Statement | undefined): Statement[] {
    if (!statement) return []
    return ts.isBlock(statement)
      ? statement.statements.flatMap(child => this.visitStatement(child))
      : this.visitStatement(statement)
  }

  private visitStatementList (statements: NodeArray<Statement>): NodeArray<Statement> {
    return visitNodeArray(statements, statement => {
      if (ts.isIfStatement(statement) && this.isConstexprCall(statement.expression)) {
        return this.transformConstexprIf(statement)
      }
      return this.visitStatement(statement)
    }, this.context.factory)
  }

  private marker (name: string, args: Node[] = []): Statement {
    const factory = this.context.factory
    return factory.createExpressionStatement(
      factory.createCallExpression(factory.createIdentifier(name), undefined, args)
    )
  }

  private transformConstexprIf (node: IfStatement): Statement[] {
    if (this.mode === 'evaluate') {
      let current: IfStatement | undefined = node
      while (current) {
        if (!this.isConstexprCall(current.expression)) return this.visitStatement(current)
        if (this.evaluate(this.getCondition(current))) return this.visitBranch(current.thenStatement)
        if (current.elseStatement && ts.isIfStatement(current.elseStatement) && this.isConstexprCall(current.elseStatement.expression)) {
          current = current.elseStatement
          continue
        }
        return this.visitBranch(current.elseStatement ?? undefined)
      }
      return []
    }

    const result: Statement[] = []
    let current: IfStatement | undefined = node
    let first = true
    while (current) {
      if (!this.isConstexprCall(current.expression)) {
        result.push(...this.visitStatement(current))
        break
      }
      result.push(this.marker(
        first ? '__emnapi_conditional_if__' : '__emnapi_conditional_elif__',
        [this.context.factory.createStringLiteral(this.getCondition(current))]
      ))
      first = false
      result.push(...this.visitBranch(current.thenStatement))
      if (current.elseStatement && ts.isIfStatement(current.elseStatement) && this.isConstexprCall(current.elseStatement.expression)) {
        current = current.elseStatement
        continue
      }
      if (current.elseStatement) {
        result.push(this.marker('__emnapi_conditional_else__'))
        result.push(...this.visitBranch(current.elseStatement))
      }
      break
    }
    result.push(this.marker('__emnapi_conditional_endif__'))
    return result
  }

  private visitor (node: Node): VisitResult<Node | undefined> {
    if (ts.isSourceFile(node)) {
      return preserveTextRange(this.context.factory.updateSourceFile(node, this.visitStatementList(node.statements)), node)
    }
    if (ts.isBlock(node)) {
      return preserveTextRange(this.context.factory.updateBlock(node, this.visitStatementList(node.statements)), node)
    }
    if (ts.isCaseClause(node)) {
      return preserveTextRange(this.context.factory.updateCaseClause(node, node.expression, this.visitStatementList(node.statements)), node)
    }
    if (ts.isDefaultClause(node)) {
      return preserveTextRange(this.context.factory.updateDefaultClause(node, this.visitStatementList(node.statements)), node)
    }
    if (ts.isIfStatement(node) && this.isConstexprCall(node.expression)) {
      return this.context.factory.createBlock(this.transformConstexprIf(node), true)
    }
    return ts.visitEachChild(node, this.visitor, this.context)
  }

  transformSourceFile (sourceFile: SourceFile): SourceFile {
    if (sourceFile.isDeclarationFile) return sourceFile
    return this.visitor(sourceFile) as SourceFile
  }
}

export function createTransformerFactory (program: Program, options: TransformOptions = {}): TransformerFactory {
  return (context) => {
    const transformer = new Transformer(program, context, options)
    return transformer.transformSourceFile.bind(transformer)
  }
}
