import type { Node, NodeArray } from 'typescript/ast'
import type { Program, Checker, Symbol, Type } from 'typescript/sync'
import { factory, NodeFlags, SyntaxKind, TokenFlags } from 'typescript/ast'
import * as tsAst from 'typescript/ast'

export type NodeFactory = any
export type TransformationContext = { factory: NodeFactory }
export type VisitResult<T extends Node | undefined = Node | undefined> = T | readonly Exclude<T, undefined>[] | undefined
export type Visitor = (node: Node) => VisitResult
export type SourceTransformer = (sourceFile: tsAst.SourceFile) => tsAst.SourceFile
export type TransformerFactory = (context: TransformationContext) => (sourceFile: tsAst.SourceFile) => tsAst.SourceFile
export type TransformerTsApi<T extends Record<string, any> = Record<string, never>> = Omit<typeof tsAst, 'visitEachChild' | 'visitNode'> & T & {
  visitEachChild<TNode extends Node> (node: TNode, visitor: Visitor, context?: unknown): TNode
  visitNode (node: Node, visitor: Visitor, test?: unknown): Node | undefined
}

export interface SyntheticComment {
  kind: number
  text: string
  leading: boolean
  hasTrailingNewLine: boolean
  [key: string]: unknown
}

export function normalizeSyntheticRanges (sourceFile: tsAst.SourceFile): void {
  const syntheticPosition = sourceFile.text.length
  const visit = (node: Node): void => {
    if (node.pos < 0) {
      ;(node as any).pos = syntheticPosition
      ;(node as any).end = syntheticPosition
    }
    node.forEachChild(visit, nodes => {
      if (nodes.pos < 0) {
        ;(nodes as any).pos = nodes.some(child => child.pos >= 0) ? 0 : syntheticPosition
        ;(nodes as any).end = syntheticPosition
      }
      for (const child of nodes) visit(child)
    })
  }
  visit(sourceFile)
}

export function findPrintedSnippet (code: string, snippet: string, from = 0): number {
  const isWord = (char: string | undefined) => char !== undefined && /[A-Za-z0-9_$]/.test(char)
  let at = code.indexOf(snippet, from)
  while (at !== -1) {
    const before = code[at - 1]
    const after = code[at + snippet.length]
    if (!(isWord(snippet[0]) && isWord(before)) && !(isWord(snippet[snippet.length - 1]) && isWord(after))) return at
    at = code.indexOf(snippet, at + 1)
  }
  return -1
}

export function setOriginalNode<T extends Node> (node: T, original: Node): T {
  Object.defineProperty(node, '__ts7OriginalNode', { value: original, configurable: true })
  return node
}

export function getOriginalNode (node: Node): Node {
  let original = node
  let next = (original as any).__ts7OriginalNode as Node | undefined
  while (next && next !== original) {
    original = next
    next = (original as any).__ts7OriginalNode as Node | undefined
  }
  return original
}

export function sameSymbol (left: Symbol | undefined, right: Symbol | undefined): boolean {
  return Boolean(left && right && left.id === right.id)
}

const symbolCacheByChecker = new WeakMap<Checker, WeakMap<Node, Symbol | undefined>>()
const typeCacheByChecker = new WeakMap<Checker, WeakMap<Node, Type>>()

export function getSymbolAtLocation (checker: Checker, node: Node) {
  const original = getOriginalNode(node)
  let cache = symbolCacheByChecker.get(checker)
  if (!cache) {
    cache = new WeakMap()
    symbolCacheByChecker.set(checker, cache)
  }
  if (cache.has(original)) return cache.get(original)
  const symbol = checker.getSymbolAtLocation(original)
  cache.set(original, symbol)
  return symbol
}

export function getTypeAtLocation (checker: Checker, node: Node) {
  const original = getOriginalNode(node)
  let cache = typeCacheByChecker.get(checker)
  if (!cache) {
    cache = new WeakMap()
    typeCacheByChecker.set(checker, cache)
  }
  if (cache.has(original)) return cache.get(original)!
  const type = checker.getTypeAtLocation(original)
  cache.set(original, type)
  return type
}

export function getConstantValue (checker: Checker, node: Node) {
  return checker.getConstantValue(getOriginalNode(node))
}

export function preserveTextRange<T> (updated: T, original: Node): T {
  const target: any = updated
  if (!target || target === original) return updated
  const setRange = (node: any, pos: number, end: number): void => {
    for (const [key, value] of [['pos', pos], ['end', end]] as const) {
      if (Object.getOwnPropertyDescriptor(node, key)?.writable) {
        node[key] = value
      } else {
        Object.defineProperty(node, key, { value, writable: true, configurable: true })
      }
    }
  }
  if (Array.isArray(target)) {
    if (target.length > 0 && target[0]?.pos < 0 && original.pos >= 0) {
      setRange(target[0], original.pos, original.end)
    }
    return updated
  }
  if (target.pos < 0 && original.pos >= 0) {
    setRange(target, original.pos, original.end)
  }
  for (const key of ['statements', 'parameters', 'arguments', 'properties', 'elements', 'declarations', 'clauses']) {
    const targetList: any = target[key]
    const sourceList: any = (original as any)[key]
    if (Array.isArray(targetList) && Array.isArray(sourceList) && (targetList as any).pos < 0 && (sourceList as any).pos >= 0) {
      setRange(targetList, (sourceList as any).pos, (sourceList as any).end)
    }
  }
  return updated
}

export function preserveSyntheticComments<T> (updated: T, original: Node): T {
  const comments = (original as any).__ts7SyntheticComments as SyntheticComment[] | undefined
  if (!comments?.length) return updated

  const nodes = Array.isArray(updated) ? updated.slice(0, 1) : [updated]
  for (const node of nodes as any[]) {
    if (!node || node === original) continue
    const existing: SyntheticComment[] = node.__ts7SyntheticComments ?? []
    const additions = comments.filter(comment => !existing.some(item => (
      item.kind === comment.kind &&
      item.leading === comment.leading &&
      item.text === comment.text
    )))
    if (additions.length > 0) {
      Object.defineProperty(node, '__ts7SyntheticComments', {
        value: [...existing, ...additions],
        configurable: true
      })
    }
  }
  return updated
}

export function preserveNodeMetadata<T> (updated: T, original: Node): T {
  preserveTextRange(updated, original)
  return preserveSyntheticComments(updated, original)
}

export function createTsCompat<T extends Record<string, any> = Record<string, never>> (
  extensions?: T,
  preserveRange: (updated: any, original: Node) => any = preserveTextRange
): TransformerTsApi<T> {
  const visitorApi = {
    visitEachChild<TNode extends Node> (node: TNode, visitor: Visitor, _context?: unknown): TNode {
      const visitChild = ((child: Node) => preserveRange(visitor(child), child)) as tsAst.Visitor
      return preserveRange(tsAst.visitEachChild(node, visitChild), node) as TNode
    },
    visitNode (node: Node, visitor: Visitor, _test?: unknown): Node | undefined {
      const visitChild = ((child: Node) => preserveRange(visitor(child), child)) as tsAst.Visitor
      return preserveRange(tsAst.visitNode(node, visitChild), node)
    }
  }
  return Object.assign({}, tsAst, visitorApi, extensions) as TransformerTsApi<T>
}

export function visitNodeArray<T extends Node> (
  nodes: NodeArray<T>,
  visitor: (node: T) => VisitResult<T>,
  nodeFactory: any = factory,
  retain: (updated: any, original: Node, index?: number) => any = preserveTextRange
): NodeArray<T> {
  const result: T[] = []
  for (const node of nodes) {
    const visited = visitor(node)
    if (Array.isArray(visited)) {
      for (let index = 0; index < visited.length; index++) result.push(retain(visited[index], node, index) as T)
    } else if (visited) {
      result.push(retain(visited, node, 0) as T)
    }
  }
  return nodeFactory.createNodeArray(result, nodes.pos, nodes.end)
}

export function getTypeChecker (program: Program): Checker {
  return program.getProject().checker
}

export function resolveDeclaration<T extends Node> (handle: any, program: Program): T | undefined {
  return handle?.resolve(program.getProject()) as T | undefined
}

export function addSyntheticComment<T extends Node> (
  node: T,
  kind: number,
  text: string,
  leading: boolean,
  hasTrailingNewLine = false,
  metadata: Record<string, unknown> = {}
): T {
  const comments: SyntheticComment[] = (node as any).__ts7SyntheticComments ?? []
  comments.push({ kind, text, leading, hasTrailingNewLine, ...metadata })
  Object.defineProperty(node, '__ts7SyntheticComments', { value: comments, configurable: true })
  return node
}

export function addSyntheticTrailingComment<T extends Node> (node: T, kind: number, text: string, hasTrailingNewLine: boolean): T {
  return addSyntheticComment(node, kind, text, false, hasTrailingNewLine)
}

export function createSyntheticCommentStore () {
  const commentsByNode = new WeakMap<object, SyntheticComment[]>()

  function get (node: Node): SyntheticComment[] | undefined {
    return (node as any).__ts7SyntheticComments ?? commentsByNode.get(node)
  }

  function set (node: Node, comments: SyntheticComment[]): void {
    commentsByNode.set(node, comments)
    try {
      Object.defineProperty(node, '__ts7SyntheticComments', { value: comments, configurable: true })
    } catch {
      // Remote AST nodes keep their comment metadata in the weak map.
    }
  }

  function add<T extends Node> (
    node: T,
    kind: number,
    text: string,
    leading: boolean,
    hasTrailingNewLine = false,
    metadata: Record<string, unknown> = {}
  ): T {
    const comments = get(node) ?? []
    comments.push({ kind, text, leading, hasTrailingNewLine, ...metadata })
    set(node, comments)
    return node
  }

  return {
    get,
    set,
    add,
    addLeading: <T extends Node>(node: T, kind: number, text: string, hasTrailingNewLine = false) => add(node, kind, text, true, hasTrailingNewLine),
    addTrailing: <T extends Node>(node: T, kind: number, text: string, hasTrailingNewLine = false) => add(node, kind, text, false, hasTrailingNewLine)
  }
}

export function createLegacyFactory (baseFactory = factory): any {
  return new Proxy({}, {
    get (_target, property: string) {
      if (property === 'createTrue') {
        return () => baseFactory.createKeywordExpression(SyntaxKind.TrueKeyword)
      }
      if (property === 'createAssignment') {
        return (left: any, right: any) => baseFactory.createBinaryExpression(undefined, left, undefined, baseFactory.createToken(SyntaxKind.EqualsToken), right)
      }
      const method = (baseFactory as any)[property]
      if (typeof method !== 'function') return method
      const call = (args: any[]) => {
        const result = method.apply(baseFactory, args)
        const original = args[0]
        if (property.startsWith('update') && original && result && result !== original) {
          preserveTextRange(result, original)
        }
        return result
      }

      switch (property) {
        case 'createNumericLiteral':
          return (value: string | number, flags?: TokenFlags) => call([String(value), flags ?? TokenFlags.None])
        case 'createStringLiteral':
          return (text: string, singleQuote?: boolean) => call([text, singleQuote ? TokenFlags.SingleQuote : TokenFlags.None])
        case 'createCallExpression':
          return (expression: any, typeArguments: any, args: any) => call([expression, undefined, typeArguments, args, NodeFlags.None])
        case 'updateCallExpression':
          return (node: any, expression: any, typeArguments: any, args: any) => call([node, expression, node.questionDotToken, typeArguments, args])
        case 'createBinaryExpression':
          return (left: any, operator: any, right: any) => call([undefined, left, undefined, typeof operator === 'number' ? baseFactory.createToken(operator) : operator, right])
        case 'createPropertyAccessExpression':
          return (expression: any, name: any) => call([expression, undefined, typeof name === 'string' ? baseFactory.createIdentifier(name) : name, NodeFlags.None])
        case 'createPropertyAssignment':
          return (name: any, initializer: any) => call([undefined, typeof name === 'string' ? baseFactory.createIdentifier(name) : name, undefined, undefined, initializer])
        case 'createNodeArray':
          return (nodes: any) => call([nodes])
        case 'createImportClause':
          return (isTypeOnly: boolean, name: any, namedBindings: any) => call([isTypeOnly ? SyntaxKind.TypeKeyword : undefined, name, namedBindings])
        case 'updateImportClause':
          return (node: any, _isTypeOnly: boolean, name: any, namedBindings: any) => call([node, name, namedBindings])
        case 'updateExportDeclaration':
          return (node: any, modifiers: any, _isTypeOnly: boolean, exportClause: any, moduleSpecifier: any, attributes: any) => call([node, modifiers, exportClause, moduleSpecifier, attributes])
        case 'updateSourceFile':
          return (node: any, statements: any) => call([node, statements, node.endOfFileToken])
        case 'updateDefaultClause':
          return (node: any, statements: any) => call([node, node.expression, statements])
        default:
          return (...args: any[]) => call(args)
      }
    }
  })
}
